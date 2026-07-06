---
layout: post
title: "mysql存储过程性能优化实例"
date: 2026-07-06 10:00:00 +0800
author: ed
description: "mysql存储过程性能优化的相关技巧和实战"
categories: 
  - 性能优化
  - mysql
tags:
  - mysql
  - SQL优化
  - 性能优化
  - 存储过程
---

## 背景

本文基于三个真实业务存储过程的优化案例，总结了 MySQL 存储过程中常见的性能瓶颈与对应的优化策略。在金融风险数据处理系统中，存在若干每日执行的 ETL 存储过程，负责将贴源层/基础层数据加工至报表展示层。随着业务数据量增长，部分存储过程执行时间明显变长，需要针对性优化。
效果是，将之前总体要执行超过4小时的30+存储过程优化到只需要10-20分钟级别。在这个过程也了解了临时表的使用和对性能的巨大提升。

涉及的三个存储过程：

| 存储过程 | 功能 |
|---|---|
| `SP_T_QF_DRCM_FIVE_CLASS_ADJUST_PROJECT_INFO` | 五级分类调整项目信息表加工 |
| `SP_T_QF_R_PROJECT_RISK_MOVE_SITUATION_COLLECT` | 项目风险迁徙情况汇总表加工 |
| `SP_T_QF_R_RISK_MOVE_SITUATION_COLLECT_COCKPIT` | 驾驶舱资产迁移情况统计表加工 |

---

## 优化一：函数包裹列导致索引失效

### 问题描述

在 `SP_T_QF_DRCM_FIVE_CLASS_ADJUST_PROJECT_INFO` 中，需要查询结果表中"本月"的历史审批数据，原写法如下：

```sql
WHERE LEFT(create_time, 7) = v_time
```

这里对 `create_time` 列应用了 `LEFT()` 函数，**MySQL 无法将函数结果与索引进行匹配**，导致全表扫描。

### 根本原因

MySQL 的 B-Tree 索引存储的是列的原始值。一旦在 WHERE 子句中对索引列进行函数运算，优化器无法利用索引做范围定位，只能逐行计算后过滤。

### 解决方案

将函数运算移到等号右侧，改写为**范围查询**：

```sql
-- 优化前（索引失效，全表扫描）
WHERE LEFT(create_time, 7) = v_time

-- 优化后（支持索引命中，范围扫描）
WHERE create_time >= CONCAT(v_time, '-01 00:00:00')
  AND create_time <  DATE_ADD(CONCAT(v_time, '-01 00:00:00'), INTERVAL 1 MONTH)
```

### 举一反三

以下写法都会导致索引失效，需要同样的改写思路：

```sql
-- 常见的索引失效写法
WHERE YEAR(create_time) = 2026
WHERE DATE_FORMAT(create_time, '%Y-%m') = '2026-06'
WHERE SUBSTR(order_no, 1, 4) = 'ORD1'

-- 正确改写：让列保持"裸露"
WHERE create_time >= '2026-01-01' AND create_time < '2027-01-01'
```

---

## 优化二：大表自关联拆分为临时表 + 索引

### 问题描述

在 `SP_T_QF_R_PROJECT_RISK_MOVE_SITUATION_COLLECT` 中，需要计算项目的五级分类迁徙情况，原逻辑是对同一张大表做自关联，用上期和本期数据对比：

```sql
FROM t_qf_b_project_risk_general_survey t1        -- 上期
LEFT JOIN t_qf_b_project_risk_general_survey t2   -- 本期
    ON t1.corp_no = t2.corp_no
    AND t1.project_no = t2.project_no
    AND t1.assets_project_big_no = t2.assets_project_big_no
    AND t1.current_five_class_no + 1 = t2.current_five_class_no
    AND t2.data_date = v_par_date
WHERE t1.assets_project_big_no IN ('1','2')
  AND t1.current_five_class_no IN ('1','2','3','4')
  AND t1.data_date = DATE_ADD(v_par_date, INTERVAL -DAY(v_par_date) DAY)
```

当 `t_qf_b_project_risk_general_survey` 表数据量较大时，这种写法会导致两次大范围扫描和笛卡尔积风险。

### 根本原因

1. **两次全量扫描**：t1 和 t2 分别需要扫描大表，过滤条件分散
2. **JOIN 时缺乏有效索引**：多条件 ON 子句匹配效率低
3. **上期日期计算混入 WHERE**：`DATE_ADD(v_par_date, INTERVAL -DAY(v_par_date) DAY)` 与变量混合，可读性差

### 解决方案

**预计算 + 临时表 + 显式添加索引**：

```sql
-- Step 1：提前计算上期日期
SET V_PRE_DATE = DATE_FORMAT(DATE_ADD(V_PAR_DATE, INTERVAL -DAY(V_PAR_DATE) DAY), '%Y-%m-%d');

-- Step 2：将上期数据过滤后写入临时表（已缩减数据量）
CREATE TEMPORARY TABLE tmp_t1 AS
SELECT corp_no, project_no, assets_project_big_no, current_five_class_no, ...
FROM t_qf_b_project_risk_general_survey
WHERE data_date = V_PRE_DATE
  AND assets_project_big_no IN ('1', '2')
  AND current_five_class_no IN ('1', '2', '3', '4');

-- Step 3：将本期数据写入临时表
CREATE TEMPORARY TABLE tmp_t2 AS
SELECT corp_no, project_no, assets_project_big_no, current_five_class_no, project_balance
FROM t_qf_b_project_risk_general_survey
WHERE data_date = V_PAR_DATE;

-- Step 4：为临时表显式添加联合索引
ALTER TABLE tmp_t1 ADD INDEX idx_join (corp_no, project_no, assets_project_big_no, current_five_class_no);
ALTER TABLE tmp_t2 ADD INDEX idx_join (corp_no, project_no, assets_project_big_no, current_five_class_no);

-- Step 5：用小表 JOIN 小表（带索引）
SELECT ...
FROM tmp_t1 t1
LEFT JOIN tmp_t2 t2
    ON t1.corp_no = t2.corp_no
    AND t1.project_no = t2.project_no
    AND t1.assets_project_big_no = t2.assets_project_big_no
    AND t1.current_five_class_no = t2.current_five_class_no - 1;
```

### 优化效果对比

| 维度 | 优化前 | 优化后 |
|---|---|---|
| 扫描方式 | 大表两次全量扫描 | 过滤后小表扫描 |
| JOIN 索引 | 依赖原表索引（未必覆盖） | 显式创建针对性联合索引 |
| 参与 JOIN 的数据量 | 多 | 仅包含符合条件的行 |
| 可读性 | 日期计算混在 WHERE 中 | 提前计算，逻辑清晰 |

---

## 优化三：物理中间表替换为内存临时表 + 双临时表解决自关联限制

### 问题描述

在 `SP_T_QF_R_RISK_MOVE_SITUATION_COLLECT_COCKPIT` 中，原方案使用了两张**物理中间表**（`_base1`、`_base2`）作为中间存储：

```sql
-- Step1：DELETE + INSERT 到物理表
DELETE FROM t_qf_r_risk_move_situation_collect_cockpit_base1 WHERE data_date = V_PAR_DATE;
INSERT INTO t_qf_r_risk_move_situation_collect_cockpit_base1 ...

-- Step2：从物理表自关联 + UNION ALL 写入另一张物理表
INSERT INTO t_qf_r_risk_move_situation_collect_cockpit_base2
SELECT ... FROM t_qf_r_risk_move_situation_collect_cockpit_base1 t1
LEFT JOIN t_qf_r_risk_move_situation_collect_cockpit_base1 t2  -- 物理表自关联
    ON ...
UNION ALL
SELECT ... FROM t_qf_r_risk_move_situation_collect_cockpit_base1 t1
LEFT JOIN t_qf_r_risk_move_situation_collect_cockpit_base1 t2
    ON ...
```

每次执行都有磁盘 I/O，并且含有无效的 `GROUP BY` 字段带来额外开销。

### 根本原因与多个坑点

#### 坑1：物理中间表带来不必要的磁盘 I/O

中间表数据生命周期只在当次 SP 执行内有用，却持久化到磁盘，每次都要 DELETE + INSERT，代价高。

#### 坑2：MySQL 5.7 临时表无法在同一语句中被重复打开

直接将物理中间表改为临时表后，在 `UNION ALL` 中同时引用同一张临时表两次，会触发：

```
ERROR 1137: Can't reopen table: 'tmp_base1'
```

这是 MySQL 5.7 的已知限制：**同一 SQL 语句中，一张临时表不能被打开两次**（UNION ALL 两个子查询各引用一次即算两次）。

#### 坑3：UNION ALL 在事务块内也会触发 reopen 问题

即使拆分写法，在同一个事务块的 `CREATE ... AS SELECT ... UNION ALL ...` 中仍会触发该错误。

### 解决方案：双临时表策略 + 拆分 INSERT

```sql
-- 【策略1】创建内容完全相同的两张临时表（a 和 b）
-- 一次扫描同时获取本期和上期数据
CREATE TEMPORARY TABLE tmp_base1_a AS
SELECT ... FROM t_qf_b_project_risk_general_survey
WHERE data_date IN (V_PAR_DATE, V_LAST_MONTH_DATE);

-- 复制一份，供自关联使用
CREATE TEMPORARY TABLE tmp_base1_b LIKE tmp_base1_a;
INSERT INTO tmp_base1_b SELECT * FROM tmp_base1_a;

ALTER TABLE tmp_base1_a ADD INDEX idx_join (...);
ALTER TABLE tmp_base1_b ADD INDEX idx_join (...);

-- 【策略2】分两次独立 INSERT 代替 UNION ALL，彻底规避 reopen 限制

-- PART1：按公司维度聚合（t1 用 _a，t2 用 _b）
INSERT INTO tmp_base2
SELECT t1.corp_no, t1.corp_name, ...
FROM tmp_base1_a t1
INNER JOIN tmp_base1_b t2
    ON t1.current_five_class_no = t2.current_five_class_no - 1
WHERE t1.data_date = V_LAST_MONTH_DATE
GROUP BY t1.corp_no, t1.corp_name, ...;

-- PART2：金控集团汇总维度（同样用两张表）
INSERT INTO tmp_base2
SELECT '1', '金控集团', ...
FROM tmp_base1_a t1
INNER JOIN tmp_base1_b t2
    ON t1.current_five_class_no = t2.current_five_class_no - 1
WHERE t1.data_date = V_LAST_MONTH_DATE
GROUP BY t1.current_five_class_no, ...;
```

### 版本演进历史

这个问题并不是一次解决的，经历了多轮迭代：

| 版本 | 改动 | 遗留问题 |
|---|---|---|
| V1.0 | 原始版本，物理中间表 | 磁盘 I/O 开销大 |
| V2.0 | 替换为内存临时表 | 触发 `Can't reopen table` |
| V2.1 | 双临时表策略 | `UNION ALL` 在事务块中仍报错 |
| V2.2 | 拆分 `UNION ALL` 为独立 INSERT | 稳定运行 |

### 优化效果对比

| 维度 | 优化前 | 优化后 |
|---|---|---|
| 中间表类型 | 物理表 | 内存临时表（ENGINE=MEMORY） |
| 磁盘 I/O | DELETE + INSERT 各一次 | 无磁盘读写 |
| 数据扫描次数 | Step1 扫描一次，Step2 再扫描两次 | 一次扫描同时获取本期+上期 |
| 自关联方式 | 物理表自关联 | 双临时表关联（规避 reopen 限制） |
| UNION ALL | 事务内一个复合 SQL | 拆分为两条独立 INSERT |
| 无效操作 | 含无效 GROUP BY | 已移除 |
| 会话结束清理 | 需手动维护或定期清理物理表 | 自动销毁 |

---

## 总结：三类优化模式

| 优化类型 | 问题特征 | 解决策略 |
|---|---|---|
| **索引利用率** | WHERE 中对列用函数，导致全表扫描 | 改写为范围查询，保持列"裸露" |
| **大表关联** | 大表自关联，过滤条件分散，缺乏有效索引 | 预过滤写临时表，显式添加联合索引 |
| **中间数据存储** | 生命周期短的数据持久化到物理表 | 用内存临时表替代，消除磁盘 I/O；双临时表策略规避 reopen 限制 |

### 通用优化原则

1. **让索引列保持裸露**：WHERE 条件中的索引列不要套函数，把计算挪到等号右边
2. **先过滤，再关联**：用临时表将参与 JOIN 的数据预先缩减到最小集
3. **为临时表显式建索引**：`CREATE TEMPORARY TABLE AS SELECT` 不会继承原表索引，需要手动 `ALTER TABLE ADD INDEX`
4. **短命数据用内存表**：只在 SP 执行期间使用的中间结果，优先 `ENGINE=MEMORY` 临时表
5. **了解数据库版本限制**：MySQL 5.7 不允许同一 SQL 中重复打开临时表，遇到 `UNION ALL` 自关联时需要双表策略或拆分 INSERT
