---
layout: post
title: "PostgreSQL 完全迁移指南：从 MySQL 到 PostgreSQL 的详细教程"
date: 2025-09-22 12:15:03 +0800
author: gaoxingliang
description: "PostgreSQL迁移指南：从MySQL到PostgreSQL的关键差异与实践 本文为熟悉MySQL但缺乏PostgreSQL经验的高级后端程序员提供全面的迁移参考。重点对比了两大数据库系统的核心架构差异： MVCC机制：MySQL使用增量存储，PostgreSQL采用整行复制，导致不同的表膨胀特性和性能表现 存储架构：PostgreSQL的统一存储引擎与MySQL的多引擎架构对比 数据类型：PostgreSQL提供更丰富的类型系统，包括JSONB、数组、范围类型等高级特性 指南还涵盖了SQL语法差异、性"
categories:
  - 迁移自CSDN
tags:
  - "postgresql"
  - "mysql"
  - "数据库"
csdn_url: "https://blog.csdn.net/scugxl/article/details/151959836"
---

> 专为熟悉 MySQL 但 PostgreSQL 经验有限的高级后端程序员设计的全面迁移指南

### 目录

- [PostgreSQL 基础概念](#postgresql-%E5%9F%BA%E7%A1%80%E6%A6%82%E5%BF%B5)
- [核心架构差异详解](#%E6%A0%B8%E5%BF%83%E6%9E%B6%E6%9E%84%E5%B7%AE%E5%BC%82%E8%AF%A6%E8%A7%A3)
- [MVCC 机制深度解析](#mvcc-%E6%9C%BA%E5%88%B6%E6%B7%B1%E5%BA%A6%E8%A7%A3%E6%9E%90)
- [安装与基础配置](#%E5%AE%89%E8%A3%85%E4%B8%8E%E5%9F%BA%E7%A1%80%E9%85%8D%E7%BD%AE)
- [数据类型对比与转换](#%E6%95%B0%E6%8D%AE%E7%B1%BB%E5%9E%8B%E5%AF%B9%E6%AF%94%E4%B8%8E%E8%BD%AC%E6%8D%A2)
- [SQL 语法差异详解](#sql-%E8%AF%AD%E6%B3%95%E5%B7%AE%E5%BC%82%E8%AF%A6%E8%A7%A3)
- [性能优化完整指南](#%E6%80%A7%E8%83%BD%E4%BC%98%E5%8C%96%E5%AE%8C%E6%95%B4%E6%8C%87%E5%8D%97)
- [索引策略与优化](#%E7%B4%A2%E5%BC%95%E7%AD%96%E7%95%A5%E4%B8%8E%E4%BC%98%E5%8C%96)
- [常见陷阱与解决方案](#%E5%B8%B8%E8%A7%81%E9%99%B7%E9%98%B1%E4%B8%8E%E8%A7%A3%E5%86%B3%E6%96%B9%E6%A1%88)
- [扩展生态系统详解](#%E6%89%A9%E5%B1%95%E7%94%9F%E6%80%81%E7%B3%BB%E7%BB%9F%E8%AF%A6%E8%A7%A3)
- [监控与诊断完整方案](#%E7%9B%91%E6%8E%A7%E4%B8%8E%E8%AF%8A%E6%96%AD%E5%AE%8C%E6%95%B4%E6%96%B9%E6%A1%88)
- [备份与恢复策略](#%E5%A4%87%E4%BB%BD%E4%B8%8E%E6%81%A2%E5%A4%8D%E7%AD%96%E7%95%A5)
- [高可用与集群配置](#%E9%AB%98%E5%8F%AF%E7%94%A8%E4%B8%8E%E9%9B%86%E7%BE%A4%E9%85%8D%E7%BD%AE)
- [迁移策略与工具](#%E8%BF%81%E7%A7%BB%E7%AD%96%E7%95%A5%E4%B8%8E%E5%B7%A5%E5%85%B7)
- [故障排除指南](#%E6%95%85%E9%9A%9C%E6%8E%92%E9%99%A4%E6%8C%87%E5%8D%97)

---

### PostgreSQL 基础概念

#### 什么是 PostgreSQL？

PostgreSQL 是一个功能强大的开源对象关系数据库系统，具有超过 35 年的开发历史。与 MySQL 相比，PostgreSQL 提供了更丰富的功能集和更强的标准兼容性。

#### 核心术语对比

| 概念 | MySQL | PostgreSQL | 说明 |
| --- | --- | --- | --- |
| 数据库实例 | Instance | Cluster | PostgreSQL 中一个实例可以包含多个数据库 |
| 数据库 | Database | Database | 概念相似，但 PostgreSQL 支持更多高级特性 |
| 表空间 | Tablespace | Tablespace | 功能更强大，支持跨数据库使用 |
| 存储引擎 | InnoDB/MyISAM | 统一存储引擎 | PostgreSQL 使用统一的存储引擎 |
| 事务隔离 | 4 个级别 | 4 个级别 | 实现方式不同，PostgreSQL 更严格 |

#### PostgreSQL 的核心优势

1. **标准兼容性**：严格遵循 SQL 标准
2. **扩展性**：支持 1200+ 扩展
3. **数据类型丰富**：支持 JSON、数组、范围类型等
4. **并发控制**：基于 MVCC 的无锁并发
5. **ACID 完整性**：完全支持 ACID 特性

---

### 核心架构差异详解

#### 1. 多版本并发控制 (MVCC) 的根本差异

##### MySQL vs PostgreSQL MVCC 对比

**MySQL InnoDB MVCC：**

- 使用 **增量存储**：只记录变更的字段
- 版本链：newest-to-oldest (N2O)
- 回滚段：存储在系统表空间中
- 索引：存储逻辑标识符

**PostgreSQL MVCC：**

- 使用 **追加式存储**：复制整行数据
- 版本链：oldest-to-newest (O2N)
- 版本存储：与数据混合存储在同一页面
- 索引：存储物理地址

##### 具体示例对比

```
-- 假设有一个用户表，包含 50 个字段
CREATE TABLE users (
    id INT PRIMARY KEY,
    username VARCHAR(50),
    email VARCHAR(100),
    -- ... 其他 47 个字段
    last_login TIMESTAMP
);

-- 只更新一个字段
UPDATE users SET last_login = NOW() WHERE id = 1;
```

**MySQL 行为：**

- 在回滚段中只存储 `last_login` 的旧值
- 主表只更新 `last_login` 字段
- 索引不需要更新（如果 `last_login` 没有索引）

**PostgreSQL 行为：**

- 复制整行数据（50 个字段）到新位置
- 更新所有相关索引指向新位置
- 原行标记为"死元组"

##### 性能影响分析

```
-- 监控表膨胀情况
SELECT 
    schemaname,
    tablename,
    pg_size_pretty(pg_total_relation_size(schemaname||'.'||tablename)) as total_size,
    pg_size_pretty(pg_relation_size(schemaname||'.'||tablename)) as table_size,
    pg_size_pretty(pg_total_relation_size(schemaname||'.'||tablename) - pg_relation_size(schemaname||'.'||tablename)) as index_size,
    n_dead_tup,
    n_live_tup,
    round(n_dead_tup * 100.0 / (n_live_tup + n_dead_tup), 2) as dead_ratio
FROM pg_stat_user_tables 
WHERE n_dead_tup > 0
ORDER BY dead_ratio DESC;
```

#### 2. 存储引擎架构差异

##### MySQL 存储引擎架构

```
-- MySQL 支持多种存储引擎
CREATE TABLE table1 (id INT) ENGINE=InnoDB;    -- 事务支持
CREATE TABLE table2 (id INT) ENGINE=MyISAM;    -- 非事务
CREATE TABLE table3 (id INT) ENGINE=Memory;    -- 内存表
```

##### PostgreSQL 统一架构

```
-- PostgreSQL 只有一种存储引擎，但支持多种访问方法
CREATE TABLE table1 (id INT);  -- 默认堆表
CREATE TABLE table2 (id INT) USING heap;  -- 显式指定堆表

-- 支持自定义访问方法（通过扩展）
CREATE EXTENSION zheap;  -- 实验性的新存储引擎
CREATE TABLE table3 (id INT) USING zheap;
```

##### 存储引擎对比表

| 特性 | MySQL InnoDB | PostgreSQL Heap | PostgreSQL zheap |
| --- | --- | --- | --- |
| 事务支持 | ✅ | ✅ | ✅ |
| 外键约束 | ✅ | ✅ | ✅ |
| 行级锁定 | ✅ | ✅ | ✅ |
| 崩溃恢复 | ✅ | ✅ | ✅ |
| 版本存储 | 增量 | 整行复制 | 增量（实验性） |
| 表膨胀 | 较少 | 较多 | 较少 |
| 索引维护 | 逻辑ID | 物理地址 | 逻辑ID |

#### 3. 数据类型系统差异

##### MySQL 数据类型特点

```
-- MySQL 相对简单的数据类型
CREATE TABLE mysql_example (
    id INT AUTO_INCREMENT PRIMARY KEY,
    name VARCHAR(255),
    email VARCHAR(255),
    age TINYINT,
    salary DECIMAL(10,2),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    data JSON
);
```

##### PostgreSQL 丰富的数据类型

```
-- PostgreSQL 支持更丰富的数据类型
CREATE TABLE postgres_example (
    id SERIAL PRIMARY KEY,  -- 自增序列
    name VARCHAR(255),
    email VARCHAR(255),
    age SMALLINT,  -- 更精确的整数类型
    salary NUMERIC(10,2),  -- 精确数值
    created_at TIMESTAMPTZ DEFAULT NOW(),  -- 带时区的时间戳
    data JSONB,  -- 二进制JSON，支持索引
    tags TEXT[],  -- 数组类型
    status user_status,  -- 枚举类型
    location POINT,  -- 几何类型
    search_vector TSVECTOR,  -- 全文搜索向量
    valid_period DATERANGE  -- 范围类型
);

-- 创建枚举类型
CREATE TYPE user_status AS ENUM ('active', 'inactive', 'pending');
```

##### 数据类型映射表

| MySQL 类型 | PostgreSQL 类型 | 说明 |
| --- | --- | --- |
| `INT AUTO_INCREMENT` | `SERIAL` 或 `BIGSERIAL` | 自增主键 |
| `VARCHAR(n)` | `VARCHAR(n)` 或 `TEXT` | 字符串类型 |
| `TINYINT` | `SMALLINT` | 小整数 |
| `DECIMAL(p,s)` | `NUMERIC(p,s)` | 精确数值 |
| `TIMESTAMP` | `TIMESTAMPTZ` | 带时区时间戳 |
| `JSON` | `JSONB` | 二进制JSON |
| `ENUM` | `ENUM` 或 `CHECK` | 枚举值 |
| - | `ARRAY` | 数组类型（MySQL 不支持） |
| - | `RANGE` | 范围类型（MySQL 不支持） |
| - | `UUID` | UUID 类型（MySQL 不支持） |

---

### MVCC 机制深度解析

#### 什么是 MVCC？

多版本并发控制（MVCC）是一种数据库并发控制方法，允许多个事务同时读取和写入数据库，而不会相互阻塞。PostgreSQL 的 MVCC 实现与 MySQL 有根本性差异。

#### PostgreSQL MVCC 工作原理

##### 1. 版本存储机制

```
-- 创建测试表
CREATE TABLE test_mvcc (
    id SERIAL PRIMARY KEY,
    name VARCHAR(50),
    value INTEGER
);

-- 插入初始数据
INSERT INTO test_mvcc (name, value) VALUES ('test', 100);

-- 查看元组信息
SELECT ctid, xmin, xmax, * FROM test_mvcc;
-- ctid: 物理位置 (页面号, 行号)
-- xmin: 创建此版本的事务ID
-- xmax: 删除此版本的事务ID (0表示未删除)
```

##### 2. 更新操作详解

```
-- 开始事务
BEGIN;

-- 更新操作
UPDATE test_mvcc SET value = 200 WHERE id = 1;

-- 在另一个会话中查看
SELECT ctid, xmin, xmax, * FROM test_mvcc;
-- 会看到新的 ctid，说明数据被复制到新位置

COMMIT;
```

##### 3. 版本链遍历

```
-- 模拟多次更新
BEGIN;
UPDATE test_mvcc SET value = 300 WHERE id = 1;
UPDATE test_mvcc SET value = 400 WHERE id = 1;
COMMIT;

-- 查看版本链（需要特殊工具或扩展）
-- 正常情况下只能看到最新版本
```

#### PostgreSQL MVCC 的四大问题

##### 1. 版本复制开销

**问题描述：**  
 PostgreSQL 在更新时复制整行数据，即使只修改一个字段。

**具体示例：**

```
-- 创建一个包含很多字段的表
CREATE TABLE large_table (
    id SERIAL PRIMARY KEY,
    field1 VARCHAR(100),
    field2 VARCHAR(100),
    field3 VARCHAR(100),
    -- ... 假设有 100 个字段
    field100 VARCHAR(100),
    status VARCHAR(20)
);

-- 只更新一个字段
UPDATE large_table SET status = 'active' WHERE id = 1;
-- PostgreSQL 会复制所有 100 个字段到新位置
```

**性能影响：**

```
-- 监控表大小变化
SELECT 
    schemaname,
    tablename,
    pg_size_pretty(pg_total_relation_size(schemaname||'.'||tablename)) as size,
    n_tup_ins as inserts,
    n_tup_upd as updates,
    n_tup_del as deletes
FROM pg_stat_user_tables 
WHERE tablename = 'large_table';
```

**解决方案：**

1. **使用 zheap 扩展（实验性）：**

```
-- 安装 zheap 扩展（需要编译支持）
CREATE EXTENSION zheap;

-- 使用 zheap 存储引擎
CREATE TABLE optimized_table (
    id SERIAL PRIMARY KEY,
    data TEXT,
    status VARCHAR(20)
) USING zheap;
```

2. **表结构优化：**

```
-- 避免过宽的表，考虑垂直分表
CREATE TABLE user_basic_info (
    id SERIAL PRIMARY KEY,
    username VARCHAR(50),
    email VARCHAR(100)
);

CREATE TABLE user_extended_info (
    user_id INTEGER REFERENCES user_basic_info(id),
    profile_data JSONB,
    preferences JSONB
);
```

3. **使用 pg\_repack 定期重组：**

```
# 安装 pg_repack
# Ubuntu/Debian
sudo apt-get install postgresql-15-repack

# 重组表
pg_repack -d your_database -t your_table
```

##### 2. 表膨胀问题

**问题描述：**  
 死元组（dead tuples）占用存储空间，影响查询性能。

**监控表膨胀：**

```
-- 创建监控视图
CREATE OR REPLACE VIEW table_bloat_monitor AS
SELECT 
    schemaname,
    tablename,
    pg_size_pretty(pg_total_relation_size(schemaname||'.'||tablename)) as total_size,
    pg_size_pretty(pg_relation_size(schemaname||'.'||tablename)) as table_size,
    n_live_tup as live_tuples,
    n_dead_tup as dead_tuples,
    CASE 
        WHEN n_live_tup + n_dead_tup > 0 
        THEN round(n_dead_tup * 100.0 / (n_live_tup + n_dead_tup), 2)
        ELSE 0 
    END as dead_ratio,
    last_vacuum,
    last_autovacuum,
    last_analyze,
    last_autoanalyze
FROM pg_stat_user_tables 
WHERE n_dead_tup > 0
ORDER BY dead_ratio DESC;

-- 使用监控视图
SELECT * FROM table_bloat_monitor WHERE dead_ratio > 10;
```

**Autovacuum 配置优化：**

```
-- 全局配置
ALTER SYSTEM SET autovacuum = on;
ALTER SYSTEM SET autovacuum_max_workers = 3;
ALTER SYSTEM SET autovacuum_naptime = '1min';
ALTER SYSTEM SET autovacuum_vacuum_threshold = 50;
ALTER SYSTEM SET autovacuum_analyze_threshold = 50;
ALTER SYSTEM SET autovacuum_vacuum_scale_factor = 0.1;  -- 降低到10%
ALTER SYSTEM SET autovacuum_analyze_scale_factor = 0.05;  -- 降低到5%

-- 表级配置（针对大表）
ALTER TABLE large_table SET (
    autovacuum_vacuum_scale_factor = 0.05,  -- 5% 触发
    autovacuum_analyze_scale_factor = 0.02,  -- 2% 触发
    autovacuum_vacuum_cost_delay = 10,  -- 降低延迟
    autovacuum_vacuum_cost_limit = 1000  -- 增加限制
);

-- 重载配置
SELECT pg_reload_conf();
```

**手动 Vacuum 操作：**

```
-- 普通 vacuum（不阻塞读写）
VACUUM ANALYZE your_table;

-- 完整 vacuum（阻塞写入，回收空间）
VACUUM FULL your_table;

-- 使用 pg_repack（在线重组，不阻塞）
-- pg_repack -d your_database -t your_table
```

##### 3. 索引维护开销

**问题描述：**  
 每次更新都需要更新所有相关索引。

**HOT 更新优化：**

```
-- 创建支持 HOT 的表结构
CREATE TABLE hot_optimized (
    id SERIAL PRIMARY KEY,
    name VARCHAR(50),
    email VARCHAR(100),
    status VARCHAR(20),
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 创建索引（只对需要查询的字段）
CREATE INDEX idx_hot_optimized_name ON hot_optimized(name);
CREATE INDEX idx_hot_optimized_status ON hot_optimized(status);

-- 更新不涉及索引字段的列（HOT 更新）
UPDATE hot_optimized SET email = 'new@example.com' WHERE id = 1;
-- 这个更新可能使用 HOT，因为 email 字段没有索引
```

**监控 HOT 更新：**

```
-- 查看 HOT 更新统计
SELECT 
    schemaname,
    tablename,
    n_tup_hot_upd as hot_updates,
    n_tup_upd as total_updates,
    CASE 
        WHEN n_tup_upd > 0 
        THEN round(n_tup_hot_upd * 100.0 / n_tup_upd, 2)
        ELSE 0 
    END as hot_ratio
FROM pg_stat_user_tables 
WHERE n_tup_upd > 0
ORDER BY hot_ratio DESC;
```

**索引设计优化：**

```
-- 避免在频繁更新的字段上创建索引
-- 错误示例：在状态字段上创建索引，但状态经常变化
CREATE INDEX idx_bad_status ON orders(status);  -- 避免

-- 正确示例：在相对稳定的字段上创建索引
CREATE INDEX idx_good_customer ON orders(customer_id);  -- 推荐

-- 使用部分索引
CREATE INDEX idx_active_orders ON orders(customer_id) 
WHERE status = 'active';
```

##### 4. Vacuum 管理复杂性

**监控 Vacuum 状态：**

```
-- 创建 Vacuum 监控视图
CREATE OR REPLACE VIEW vacuum_monitor AS
SELECT 
    schemaname,
    tablename,
    last_vacuum,
    last_autovacuum,
    last_analyze,
    last_autoanalyze,
    vacuum_count,
    autovacuum_count,
    analyze_count,
    autoanalyze_count,
    CASE 
        WHEN last_autovacuum IS NULL THEN 'Never'
        WHEN last_autovacuum < NOW() - INTERVAL '1 day' THEN 'Stale'
        ELSE 'Recent'
    END as vacuum_status
FROM pg_stat_user_tables
ORDER BY last_autovacuum NULLS FIRST;

-- 使用监控视图
SELECT * FROM vacuum_monitor WHERE vacuum_status IN ('Never', 'Stale');
```

**Vacuum 阻塞问题：**

```
-- 查看长时间运行的事务
SELECT 
    pid,
    usename,
    application_name,
    client_addr,
    state,
    query_start,
    now() - query_start as duration,
    query
FROM pg_stat_activity 
WHERE state IN ('active', 'idle in transaction')
  AND now() - query_start > INTERVAL '1 hour'
ORDER BY duration DESC;

-- 查看 Vacuum 进程
SELECT 
    pid,
    usename,
    application_name,
    state,
    query_start,
    query
FROM pg_stat_activity 
WHERE query LIKE '%VACUUM%' OR query LIKE '%ANALYZE%';
```

**Vacuum 调优策略：**

```
-- 针对不同表设置不同的 Vacuum 策略
-- 大表：更频繁的 Vacuum
ALTER TABLE large_frequently_updated_table SET (
    autovacuum_vacuum_scale_factor = 0.02,  -- 2%
    autovacuum_analyze_scale_factor = 0.01,  -- 1%
    autovacuum_vacuum_cost_delay = 5,  -- 更积极的 Vacuum
    autovacuum_vacuum_cost_limit = 2000
);

-- 小表：标准设置
ALTER TABLE small_stable_table SET (
    autovacuum_vacuum_scale_factor = 0.2,  -- 20%
    autovacuum_analyze_scale_factor = 0.1   -- 10%
);

-- 只读表：禁用 Autovacuum
ALTER TABLE read_only_table SET (
    autovacuum_enabled = false
);
```

---

### 安装与基础配置

#### PostgreSQL 安装

##### Ubuntu/Debian 安装

```
# 添加 PostgreSQL 官方仓库
sudo apt update
sudo apt install -y wget ca-certificates
wget --quiet -O - https://www.postgresql.org/media/keys/ACCC4CF8.asc | sudo apt-key add -
echo "deb http://apt.postgresql.org/pub/repos/apt/ $(lsb_release -cs)-pgdg main" | sudo tee /etc/apt/sources.list.d/pgdg.list

# 安装 PostgreSQL 15
sudo apt update
sudo apt install -y postgresql-15 postgresql-client-15 postgresql-contrib-15

# 启动服务
sudo systemctl start postgresql
sudo systemctl enable postgresql
```

##### CentOS/RHEL 安装

```
# 安装 PostgreSQL 官方仓库
sudo yum install -y https://download.postgresql.org/pub/repos/yum/reporpms/EL-7-x86_64/pgdg-redhat-repo-latest.noarch.rpm

# 安装 PostgreSQL 15
sudo yum install -y postgresql15-server postgresql15 postgresql15-contrib

# 初始化数据库
sudo /usr/pgsql-15/bin/postgresql-15-setup initdb

# 启动服务
sudo systemctl start postgresql-15
sudo systemctl enable postgresql-15
```

##### Docker 安装

```
# 使用 Docker 运行 PostgreSQL
docker run --name postgres-15 \
  -e POSTGRES_PASSWORD=your_password \
  -e POSTGRES_DB=your_database \
  -p 5432:5432 \
  -v postgres_data:/var/lib/postgresql/data \
  -d postgres:15

# 连接到容器
docker exec -it postgres-15 psql -U postgres
```

#### 基础配置

##### 1. 连接配置

```
# 编辑 postgresql.conf
sudo nano /etc/postgresql/15/main/postgresql.conf

# 关键配置项
listen_addresses = '*'          # 允许外部连接
port = 5432                     # 端口号
max_connections = 100           # 最大连接数
shared_buffers = 256MB          # 共享缓冲区
effective_cache_size = 1GB      # 有效缓存大小
work_mem = 4MB                  # 工作内存
maintenance_work_mem = 64MB     # 维护工作内存
```

##### 2. 认证配置

```
# 编辑 pg_hba.conf
sudo nano /etc/postgresql/15/main/pg_hba.conf

# 添加连接规则
# TYPE  DATABASE        USER            ADDRESS                 METHOD
local   all             postgres                                peer
local   all             all                                     md5
host    all             all             127.0.0.1/32            md5
host    all             all             ::1/128                 md5
host    all             all             0.0.0.0/0               md5
```

##### 3. 重启服务

```
# 重启 PostgreSQL 服务
sudo systemctl restart postgresql

# 检查服务状态
sudo systemctl status postgresql

# 查看日志
sudo journalctl -u postgresql -f
```

#### 用户和权限管理

##### 创建用户和数据库

```
-- 连接到 PostgreSQL
sudo -u postgres psql

-- 创建用户
CREATE USER app_user WITH PASSWORD 'secure_password';

-- 创建数据库
CREATE DATABASE app_database OWNER app_user;

-- 授予权限
GRANT ALL PRIVILEGES ON DATABASE app_database TO app_user;

-- 连接到新数据库
\c app_database

-- 授予模式权限
GRANT ALL ON SCHEMA public TO app_user;
GRANT ALL PRIVILEGES ON ALL TABLES IN SCHEMA public TO app_user;
GRANT ALL PRIVILEGES ON ALL SEQUENCES IN SCHEMA public TO app_user;

-- 设置默认权限
ALTER DEFAULT PRIVILEGES IN SCHEMA public GRANT ALL ON TABLES TO app_user;
ALTER DEFAULT PRIVILEGES IN SCHEMA public GRANT ALL ON SEQUENCES TO app_user;
```

##### 角色管理

```
-- 创建角色
CREATE ROLE readonly_role;
CREATE ROLE write_role;

-- 授予权限
GRANT CONNECT ON DATABASE app_database TO readonly_role;
GRANT USAGE ON SCHEMA public TO readonly_role;
GRANT SELECT ON ALL TABLES IN SCHEMA public TO readonly_role;

GRANT CONNECT ON DATABASE app_database TO write_role;
GRANT USAGE ON SCHEMA public TO write_role;
GRANT SELECT, INSERT, UPDATE, DELETE ON ALL TABLES IN SCHEMA public TO write_role;

-- 将用户添加到角色
GRANT readonly_role TO app_user;
GRANT write_role TO app_user;
```

---

### 数据类型对比与转换

#### 数值类型

##### MySQL vs PostgreSQL 数值类型

| MySQL 类型 | PostgreSQL 类型 | 说明 | 示例 |
| --- | --- | --- | --- |
| `TINYINT` | `SMALLINT` | 小整数 | `SMALLINT` |
| `SMALLINT` | `SMALLINT` | 小整数 | `SMALLINT` |
| `MEDIUMINT` | `INTEGER` | 中等整数 | `INTEGER` |
| `INT` | `INTEGER` | 整数 | `INTEGER` |
| `BIGINT` | `BIGINT` | 大整数 | `BIGINT` |
| `DECIMAL(p,s)` | `NUMERIC(p,s)` | 精确数值 | `NUMERIC(10,2)` |
| `FLOAT` | `REAL` | 单精度浮点 | `REAL` |
| `DOUBLE` | `DOUBLE PRECISION` | 双精度浮点 | `DOUBLE PRECISION` |

##### 数值类型示例

```
-- MySQL 表结构
CREATE TABLE mysql_numeric (
    id TINYINT AUTO_INCREMENT PRIMARY KEY,
    small_num SMALLINT,
    medium_num MEDIUMINT,
    normal_num INT,
    big_num BIGINT,
    decimal_num DECIMAL(10,2),
    float_num FLOAT,
    double_num DOUBLE
);

-- PostgreSQL 对应表结构
CREATE TABLE postgres_numeric (
    id SMALLSERIAL PRIMARY KEY,  -- 自增小整数
    small_num SMALLINT,
    medium_num INTEGER,          -- MEDIUMINT 映射到 INTEGER
    normal_num INTEGER,
    big_num BIGINT,
    decimal_num NUMERIC(10,2),   -- DECIMAL 改为 NUMERIC
    float_num REAL,              -- FLOAT 改为 REAL
    double_num DOUBLE PRECISION  -- DOUBLE 改为 DOUBLE PRECISION
);
```

#### 字符串类型

##### 字符串类型对比

| MySQL 类型 | PostgreSQL 类型 | 说明 | 示例 |
| --- | --- | --- | --- |
| `CHAR(n)` | `CHAR(n)` | 固定长度字符串 | `CHAR(10)` |
| `VARCHAR(n)` | `VARCHAR(n)` | 可变长度字符串 | `VARCHAR(255)` |
| `TEXT` | `TEXT` | 长文本 | `TEXT` |
| `TINYTEXT` | `TEXT` | 短文本 | `TEXT` |
| `MEDIUMTEXT` | `TEXT` | 中等文本 | `TEXT` |
| `LONGTEXT` | `TEXT` | 长文本 | `TEXT` |
| `ENUM` | `ENUM` 或 `CHECK` | 枚举类型 | `ENUM('a','b','c')` |

##### 字符串类型示例

```
-- MySQL 字符串表
CREATE TABLE mysql_strings (
    id INT AUTO_INCREMENT PRIMARY KEY,
    fixed_char CHAR(10),
    variable_char VARCHAR(255),
    long_text LONGTEXT,
    status ENUM('active', 'inactive', 'pending')
);

-- PostgreSQL 对应表结构
CREATE TYPE user_status AS ENUM ('active', 'inactive', 'pending');

CREATE TABLE postgres_strings (
    id SERIAL PRIMARY KEY,
    fixed_char CHAR(10),
    variable_char VARCHAR(255),
    long_text TEXT,                    -- 所有文本类型统一为 TEXT
    status user_status                 -- 使用自定义枚举类型
);

-- 或者使用 CHECK 约束
CREATE TABLE postgres_strings_check (
    id SERIAL PRIMARY KEY,
    fixed_char CHAR(10),
    variable_char VARCHAR(255),
    long_text TEXT,
    status VARCHAR(20) CHECK (status IN ('active', 'inactive', 'pending'))
);
```

#### 日期时间类型

##### 日期时间类型对比

| MySQL 类型 | PostgreSQL 类型 | 说明 | 示例 |
| --- | --- | --- | --- |
| `DATE` | `DATE` | 日期 | `DATE` |
| `TIME` | `TIME` | 时间 | `TIME` |
| `DATETIME` | `TIMESTAMP` | 日期时间 | `TIMESTAMP` |
| `TIMESTAMP` | `TIMESTAMPTZ` | 带时区时间戳 | `TIMESTAMPTZ` |
| `YEAR` | `SMALLINT` | 年份 | `SMALLINT` |

##### 日期时间类型示例

```
-- MySQL 日期时间表
CREATE TABLE mysql_datetime (
    id INT AUTO_INCREMENT PRIMARY KEY,
    birth_date DATE,
    work_time TIME,
    created_at DATETIME,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    birth_year YEAR
);

-- PostgreSQL 对应表结构
CREATE TABLE postgres_datetime (
    id SERIAL PRIMARY KEY,
    birth_date DATE,
    work_time TIME,
    created_at TIMESTAMP,                    -- DATETIME 改为 TIMESTAMP
    updated_at TIMESTAMPTZ DEFAULT NOW(),   -- 带时区的时间戳
    birth_year SMALLINT                     -- YEAR 改为 SMALLINT
);

-- 创建自动更新触发器
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ language 'plpgsql';

CREATE TRIGGER update_postgres_datetime_updated_at 
    BEFORE UPDATE ON postgres_datetime 
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
```

#### JSON 类型

##### JSON 类型对比

| MySQL 类型 | PostgreSQL 类型 | 说明 | 优势 |
| --- | --- | --- | --- |
| `JSON` | `JSONB` | 二进制 JSON | 支持索引，查询更快 |

##### JSON 类型示例

```
-- MySQL JSON 表
CREATE TABLE mysql_json (
    id INT AUTO_INCREMENT PRIMARY KEY,
    user_data JSON,
    settings JSON
);

-- PostgreSQL JSONB 表
CREATE TABLE postgres_jsonb (
    id SERIAL PRIMARY KEY,
    user_data JSONB,    -- 使用 JSONB 而不是 JSON
    settings JSONB
);

-- 创建 GIN 索引支持 JSON 查询
CREATE INDEX idx_user_data_gin ON postgres_jsonb USING gin (user_data);
CREATE INDEX idx_settings_gin ON postgres_jsonb USING gin (settings);

-- JSON 查询示例
-- MySQL 查询
SELECT * FROM mysql_json WHERE JSON_EXTRACT(user_data, '$.name') = 'John';

-- PostgreSQL 查询
SELECT * FROM postgres_jsonb WHERE user_data->>'name' = 'John';
SELECT * FROM postgres_jsonb WHERE user_data @> '{"status": "active"}';
SELECT * FROM postgres_jsonb WHERE user_data ? 'email';
```

#### 数组类型

##### PostgreSQL 独有的数组类型

```
-- PostgreSQL 支持数组类型（MySQL 不支持）
CREATE TABLE postgres_arrays (
    id SERIAL PRIMARY KEY,
    tags TEXT[],                    -- 文本数组
    scores INTEGER[],               -- 整数数组
    coordinates FLOAT[][],          -- 二维浮点数组
    metadata JSONB[]                -- JSONB 数组
);

-- 插入数组数据
INSERT INTO postgres_arrays (tags, scores, coordinates, metadata) VALUES (
    ARRAY['tag1', 'tag2', 'tag3'],
    ARRAY[85, 92, 78],
    ARRAY[[1.0, 2.0], [3.0, 4.0]],
    ARRAY['{"key": "value1"}', '{"key": "value2"}']
);

-- 数组查询
SELECT * FROM postgres_arrays WHERE 'tag1' = ANY(tags);
SELECT * FROM postgres_arrays WHERE array_length(scores, 1) > 2;
SELECT * FROM postgres_arrays WHERE tags @> ARRAY['tag1'];

-- 创建数组索引
CREATE INDEX idx_tags_gin ON postgres_arrays USING gin (tags);
```

#### 范围类型

##### PostgreSQL 独有的范围类型

```
-- PostgreSQL 支持范围类型（MySQL 不支持）
CREATE TABLE postgres_ranges (
    id SERIAL PRIMARY KEY,
    price_range NUMRANGE,           -- 数值范围
    date_range DATERANGE,           -- 日期范围
    time_range TSRANGE,             -- 时间戳范围
    text_range INTRANGE             -- 整数范围
);

-- 插入范围数据
INSERT INTO postgres_ranges (price_range, date_range, time_range, text_range) VALUES (
    '[100, 500)',                   -- 100 到 500（不包含 500）
    '[2023-01-01, 2023-12-31]',    -- 2023 年全年
    '[2023-01-01 00:00:00, 2023-01-01 23:59:59]',
    '[1, 10]'                       -- 1 到 10
);

-- 范围查询
SELECT * FROM postgres_ranges WHERE price_range @> 250;  -- 包含 250
SELECT * FROM postgres_ranges WHERE date_range && '[2023-06-01, 2023-06-30]';  -- 重叠
SELECT * FROM postgres_ranges WHERE price_range <@ '[0, 1000]';  -- 被包含

-- 创建范围索引
CREATE INDEX idx_price_range ON postgres_ranges USING gist (price_range);
```

---

### 性能优化关键点

#### 1. 内存配置优化

##### work\_mem 配置详解

**work\_mem 配置公式：**

```
-- 推荐公式
work_mem = (总内存 * 0.8 - shared_buffers) / 活跃连接数

-- 示例：16GB 内存，100 个连接
work_mem = (16GB * 0.8 - 4GB) / 100 = 96MB
```

**work\_mem 影响的操作：**

- 排序操作（ORDER BY）
- 哈希连接（Hash Join）
- 哈希聚合（Hash Aggregate）
- 位图操作（Bitmap operations）

**监控 work\_mem 使用：**

```
-- 查看临时文件使用情况
SELECT 
    datname,
    temp_files,
    temp_bytes,
    pg_size_pretty(temp_bytes) as temp_size
FROM pg_stat_database 
WHERE temp_files > 0
ORDER BY temp_bytes DESC;

-- 查看当前排序操作
SELECT 
    pid,
    usename,
    application_name,
    query,
    state
FROM pg_stat_activity 
WHERE query LIKE '%ORDER BY%' 
   OR query LIKE '%GROUP BY%'
   OR query LIKE '%DISTINCT%';
```

##### 关键参数对比

| 参数 | MySQL 对应 | PostgreSQL 建议 | 说明 |
| --- | --- | --- | --- |
| work\_mem | sort\_buffer\_size | 64MB-256MB | 排序/哈希操作内存 |
| shared\_buffers | innodb\_buffer\_pool\_size | 25% 总内存 | 共享缓存 |
| effective\_cache\_size | - | 75% 总内存 | 查询规划器参考 |
| maintenance\_work\_mem | - | 256MB-1GB | 维护操作内存 |
| temp\_buffers | - | 8MB | 临时表缓冲区 |

##### 内存配置示例

```
-- 针对不同规模系统的配置建议

-- 小型系统 (4GB 内存)
shared_buffers = 1GB
effective_cache_size = 3GB
work_mem = 4MB
maintenance_work_mem = 64MB
temp_buffers = 8MB

-- 中型系统 (16GB 内存)
shared_buffers = 4GB
effective_cache_size = 12GB
work_mem = 16MB
maintenance_work_mem = 256MB
temp_buffers = 8MB

-- 大型系统 (64GB 内存)
shared_buffers = 16GB
effective_cache_size = 48GB
work_mem = 64MB
maintenance_work_mem = 1GB
temp_buffers = 8MB
```

#### 2. 连接管理优化

##### 连接池配置

**pgbouncer 配置示例：**

```
# /etc/pgbouncer/pgbouncer.ini
[databases]
app_db = host=127.0.0.1 port=5432 dbname=app_database pool_size=100

[pgbouncer]
listen_addr = 127.0.0.1
listen_port = 6432
auth_type = md5
auth_file = /etc/pgbouncer/userlist.txt
pool_mode = transaction
max_client_conn = 1000
default_pool_size = 100
reserve_pool_size = 10
reserve_pool_timeout = 5
log_connections = 1
log_disconnections = 1
log_pooler_errors = 1
```

**连接池模式对比：**

| 模式 | 连接复用 | 事务隔离 | 适用场景 |
| --- | --- | --- | --- |
| Session | 低 | 完整 | 需要会话状态的应用 |
| Transaction | 高 | 事务级 | 无状态应用 |
| Statement | 最高 | 语句级 | 简单查询应用 |

##### 连接监控

```
-- 查看当前连接
SELECT 
    datname,
    usename,
    application_name,
    client_addr,
    state,
    query_start,
    now() - query_start as duration,
    query
FROM pg_stat_activity 
WHERE state != 'idle'
ORDER BY query_start;

-- 查看连接统计
SELECT 
    datname,
    numbackends as current_connections,
    max_connections,
    round(numbackends * 100.0 / max_connections, 2) as connection_usage
FROM pg_stat_database 
JOIN pg_database ON pg_stat_database.datname = pg_database.datname;
```

#### 2. 查询优化策略

**CTE vs 子查询性能：**

```
-- 可能较慢的 CTE 写法
WITH user_stats AS (
    SELECT user_id, COUNT(*) as order_count
    FROM orders GROUP BY user_id
)
SELECT u.name, us.order_count
FROM users u JOIN user_stats us ON u.id = us.user_id;

-- 通常更快的子查询写法
SELECT u.name, us.order_count
FROM users u JOIN (
    SELECT user_id, COUNT(*) as order_count
    FROM orders GROUP BY user_id
) us ON u.id = us.user_id;
```

**索引策略差异：**

```
-- PostgreSQL 不会自动为外键创建索引
-- 需要手动创建
CREATE INDEX CONCURRENTLY idx_orders_user_id ON orders(user_id);

-- 复合索引顺序很重要
CREATE INDEX idx_orders_status_created ON orders(status, created_at);
-- 支持 (status), (status, created_at) 查询
```

#### 3. 连接管理

**连接池配置：**

```
# pgbouncer 配置
[databases]
mydb = host=127.0.0.1 port=5432 pool_size=100

[pgbouncer]
pool_mode = transaction  # 事务级连接池
max_client_conn = 1000
```

---

### 常见陷阱与解决方案

#### 1. 函数和存储过程滥用

**问题：** 将过多业务逻辑放入数据库函数

```
-- 避免：复杂的嵌套函数
CREATE OR REPLACE FUNCTION complex_business_logic()
RETURNS TABLE(...) AS $$
BEGIN
    -- 大量内存操作和递归调用
    -- 影响数据库性能
END;
$$ LANGUAGE plpgsql;
```

**解决方案：**

- 保持函数简单，标记为 `IMMUTABLE` 或 `STABLE`
- 复杂逻辑移回应用层
- 使用触发器时限制数量

#### 2. 触发器性能问题

**最佳实践：**

```
-- 每个表最多一个 BEFORE 和一个 AFTER 触发器
CREATE OR REPLACE FUNCTION before_orders()
RETURNS TRIGGER AS $$
BEGIN
    -- 所有逻辑集中在一个函数中
    IF TG_OP = 'INSERT' THEN
        -- 插入逻辑
    ELSIF TG_OP = 'UPDATE' THEN
        -- 更新逻辑
    END IF;
    RETURN COALESCE(NEW, OLD);
END;
$$ LANGUAGE plpgsql;
```

#### 3. NOTIFY 机制限制

**问题：** 大量 NOTIFY 事件影响性能

```
-- 替代方案：事件队列表
CREATE TABLE event_queue (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id uuid NOT NULL,
    type text NOT NULL,
    data jsonb NOT NULL,
    created_at timestamptz NOT NULL DEFAULT now(),
    acquired_at timestamptz
);

-- 批量处理事件
UPDATE event_queue 
SET acquired_at = now() 
WHERE id IN (
    SELECT id FROM event_queue 
    WHERE acquired_at IS NULL 
    ORDER BY created_at 
    FOR UPDATE SKIP LOCKED 
    LIMIT 1000
) RETURNING *;
```

#### 4. NULL 值处理差异

**问题：** `IS NOT DISTINCT FROM` 不使用索引

```
-- 避免：不使用索引
SELECT * FROM users WHERE email IS NOT DISTINCT FROM 'test@example.com';

-- 推荐：显式 NULL 检查
SELECT * FROM users 
WHERE (email IS NULL AND 'test@example.com' IS NULL) 
   OR email = 'test@example.com';
```

---

### 扩展生态系统

#### 核心扩展推荐

##### 1. 性能监控扩展

```
-- 安装关键监控扩展
CREATE EXTENSION IF NOT EXISTS pg_stat_statements;
CREATE EXTENSION IF NOT EXISTS pg_qualstats;
CREATE EXTENSION IF NOT EXISTS pg_wait_sampling;

-- 查看慢查询
SELECT query, total_time, calls, mean_time
FROM pg_stat_statements 
ORDER BY total_time DESC 
LIMIT 10;
```

##### 2. 数据模型扩展

```
-- JSONB 文档存储
CREATE TABLE products (
    id serial PRIMARY KEY,
    metadata jsonb,
    created_at timestamptz DEFAULT now()
);

-- 创建 GIN 索引支持复杂查询
CREATE INDEX idx_products_metadata ON products USING gin (metadata);

-- 查询示例
SELECT * FROM products 
WHERE metadata @> '{"category": "electronics", "price": {"$gt": 500}}';
```

##### 3. 时序数据扩展

```
-- TimescaleDB 超表
SELECT create_hypertable('sensor_data', 'timestamp');

-- 自动分区和压缩
ALTER TABLE sensor_data SET (
    timescaledb.compress,
    timescaledb.compress_orderby = 'timestamp DESC'
);
```

#### 外部数据包装器 (FDW)

```
-- 连接其他 PostgreSQL 实例
CREATE EXTENSION postgres_fdw;

CREATE SERVER remote_server 
FOREIGN DATA WRAPPER postgres_fdw 
OPTIONS (host 'remote-host', port '5432', dbname 'remote_db');

-- 联邦查询
SELECT l.name, r.amount 
FROM local_customers l 
JOIN remote_orders r ON l.id = r.customer_id;
```

---

### 监控与诊断

#### 1. 关键监控指标

```
-- 数据库健康检查
SELECT 
    datname,
    numbackends as connections,
    xact_commit + xact_rollback as transactions,
    blks_read + blks_hit as total_blocks,
    round(blks_hit * 100.0 / (blks_hit + blks_read), 2) as cache_hit_ratio
FROM pg_stat_database 
WHERE datname = current_database();
```

#### 2. 表膨胀监控

```
-- 监控表膨胀
SELECT 
    schemaname,
    tablename,
    pg_size_pretty(pg_total_relation_size(schemaname||'.'||tablename)) as size,
    n_dead_tup,
    n_live_tup,
    round(n_dead_tup * 100.0 / (n_live_tup + n_dead_tup), 2) as dead_ratio
FROM pg_stat_user_tables 
WHERE n_dead_tup > 0
ORDER BY dead_ratio DESC;
```

#### 3. 索引使用情况

```
-- 检查未使用的索引
SELECT 
    schemaname,
    tablename,
    indexname,
    idx_tup_read,
    idx_tup_fetch
FROM pg_stat_user_indexes 
WHERE idx_tup_read = 0 
  AND idx_tup_fetch = 0;
```

---

### 迁移策略建议

#### 1. 分阶段迁移计划

**阶段一：基础设施准备**

- 设置 PostgreSQL 集群
- 配置监控和备份
- 建立开发/测试环境

**阶段二：数据迁移**

- 使用 `pgloader` 或自定义脚本
- 验证数据完整性
- 性能基准测试

**阶段三：应用适配**

- 修改 SQL 查询语法
- 调整连接池配置
- 更新监控指标

#### 2. 关键迁移工具

```
# 使用 pgloader 迁移
pgloader mysql://user:pass@mysql-host/dbname \
         postgresql://user:pass@pg-host/dbname

# 使用 ora2pg 从 Oracle 迁移（也可用于 MySQL）
ora2pg -c config/ora2pg.conf
```

#### 3. 性能验证

```
-- 创建测试环境
CREATE DATABASE test_migration;

-- 运行性能基准
\timing on
EXPLAIN ANALYZE SELECT * FROM large_table WHERE indexed_column = 'value';

-- 对比迁移前后的性能指标
```

---

### 总结与建议

#### 核心要点

1. **MVCC 差异**：PostgreSQL 的追加式 MVCC 需要更仔细的监控和管理
2. **扩展生态**：充分利用 PostgreSQL 的扩展机制，避免多数据库架构
3. **性能调优**：重点关注 `work_mem`、`shared_buffers` 和 autovacuum 配置
4. **监控先行**：建立完善的监控体系，特别是表膨胀和索引使用情况

#### 迁移检查清单

- 配置合适的 `work_mem` 和 `shared_buffers`
- 设置 autovacuum 参数
- 为外键创建索引
- 安装关键监控扩展
- 建立表膨胀监控
- 配置连接池
- 设置备份和恢复策略
- 建立性能基准测试

#### 长期维护建议

1. **定期监控**：每周检查表膨胀和索引使用情况
2. **性能调优**：根据实际负载调整参数
3. **扩展评估**：定期评估新的扩展和功能
4. **团队培训**：确保团队了解 PostgreSQL 特有的概念和最佳实践

---

### 故障排除指南

#### 常见问题与解决方案

##### 1. 连接问题

**问题：无法连接到 PostgreSQL**

```
# 检查服务状态
sudo systemctl status postgresql

# 检查端口是否监听
sudo netstat -tlnp | grep 5432

# 检查配置文件
sudo nano /etc/postgresql/15/main/postgresql.conf
# 确保 listen_addresses = '*'

# 检查认证配置
sudo nano /etc/postgresql/15/main/pg_hba.conf
# 确保有正确的连接规则

# 重启服务
sudo systemctl restart postgresql
```

**问题：认证失败**

```
-- 检查用户是否存在
SELECT usename FROM pg_user WHERE usename = 'your_username';

-- 重置密码
ALTER USER your_username WITH PASSWORD 'new_password';

-- 检查用户权限
\du your_username
```

##### 2. 性能问题

**问题：查询缓慢**

```
-- 启用查询统计
CREATE EXTENSION IF NOT EXISTS pg_stat_statements;

-- 查看慢查询
SELECT 
    query,
    calls,
    total_time,
    mean_time,
    rows,
    100.0 * shared_blks_hit / nullif(shared_blks_hit + shared_blks_read, 0) AS hit_percent
FROM pg_stat_statements 
ORDER BY mean_time DESC 
LIMIT 10;

-- 分析查询计划
EXPLAIN (ANALYZE, BUFFERS) SELECT * FROM your_table WHERE condition;
```

**问题：表膨胀严重**

```
-- 检查表膨胀
SELECT 
    schemaname,
    tablename,
    n_dead_tup,
    n_live_tup,
    round(n_dead_tup * 100.0 / (n_live_tup + n_dead_tup), 2) as dead_ratio
FROM pg_stat_user_tables 
WHERE n_dead_tup > 0
ORDER BY dead_ratio DESC;

-- 手动执行 vacuum
VACUUM ANALYZE your_table;

-- 如果膨胀严重，使用 pg_repack
-- pg_repack -d your_database -t your_table
```

##### 3. 锁问题

**问题：查询被阻塞**

```
-- 查看当前锁
SELECT 
    blocked_locks.pid AS blocked_pid,
    blocked_activity.usename AS blocked_user,
    blocking_locks.pid AS blocking_pid,
    blocking_activity.usename AS blocking_user,
    blocked_activity.query AS blocked_statement,
    blocking_activity.query AS current_statement_in_blocking_process
FROM pg_catalog.pg_locks blocked_locks
JOIN pg_catalog.pg_stat_activity blocked_activity ON blocked_activity.pid = blocked_locks.pid
JOIN pg_catalog.pg_locks blocking_locks ON blocking_locks.locktype = blocked_locks.locktype
    AND blocking_locks.database IS NOT DISTINCT FROM blocked_locks.database
    AND blocking_locks.relation IS NOT DISTINCT FROM blocked_locks.relation
    AND blocking_locks.page IS NOT DISTINCT FROM blocked_locks.page
    AND blocking_locks.tuple IS NOT DISTINCT FROM blocked_locks.tuple
    AND blocking_locks.virtualxid IS NOT DISTINCT FROM blocked_locks.virtualxid
    AND blocking_locks.transactionid IS NOT DISTINCT FROM blocked_locks.transactionid
    AND blocking_locks.classid IS NOT DISTINCT FROM blocked_locks.classid
    AND blocking_locks.objid IS NOT DISTINCT FROM blocked_locks.objid
    AND blocking_locks.objsubid IS NOT DISTINCT FROM blocked_locks.objsubid
    AND blocking_locks.pid != blocked_locks.pid
JOIN pg_catalog.pg_stat_activity blocking_activity ON blocking_activity.pid = blocking_locks.pid
WHERE NOT blocked_locks.granted;

-- 终止阻塞的查询
SELECT pg_terminate_backend(blocked_pid);
```

##### 4. 磁盘空间问题

**问题：磁盘空间不足**

```
-- 检查数据库大小
SELECT 
    datname,
    pg_size_pretty(pg_database_size(datname)) as size
FROM pg_database
ORDER BY pg_database_size(datname) DESC;

-- 检查表大小
SELECT 
    schemaname,
    tablename,
    pg_size_pretty(pg_total_relation_size(schemaname||'.'||tablename)) as size
FROM pg_stat_user_tables
ORDER BY pg_total_relation_size(schemaname||'.'||tablename) DESC;

-- 清理 WAL 日志（谨慎操作）
-- 首先检查 WAL 日志大小
SELECT pg_size_pretty(pg_wal_lsn_diff(pg_current_wal_lsn(), '0/0'));

-- 手动切换 WAL 日志
SELECT pg_switch_wal();
```

##### 5. 配置问题

**问题：参数配置错误**

```
-- 查看当前配置
SELECT name, setting, unit, context, short_desc 
FROM pg_settings 
WHERE name IN ('shared_buffers', 'work_mem', 'effective_cache_size');

-- 修改配置
ALTER SYSTEM SET shared_buffers = '256MB';
SELECT pg_reload_conf();

-- 查看配置是否生效
SHOW shared_buffers;
```

#### 监控脚本

##### 系统健康检查脚本

```
#!/bin/bash
# postgres_health_check.sh

echo "=== PostgreSQL Health Check ==="
echo "Date: $(date)"
echo

# 检查服务状态
echo "1. Service Status:"
systemctl is-active postgresql

# 检查连接数
echo -e "\n2. Connection Status:"
psql -U postgres -c "
SELECT 
    datname,
    numbackends as current_connections,
    max_connections,
    round(numbackends * 100.0 / max_connections, 2) as usage_percent
FROM pg_stat_database 
JOIN pg_database ON pg_stat_database.datname = pg_database.datname
WHERE datname NOT IN ('template0', 'template1', 'postgres');
"

# 检查表膨胀
echo -e "\n3. Table Bloat Check:"
psql -U postgres -c "
SELECT 
    schemaname,
    tablename,
    n_dead_tup,
    n_live_tup,
    round(n_dead_tup * 100.0 / (n_live_tup + n_dead_tup), 2) as dead_ratio
FROM pg_stat_user_tables 
WHERE n_dead_tup > 0 AND n_live_tup + n_dead_tup > 1000
ORDER BY dead_ratio DESC
LIMIT 10;
"

# 检查慢查询
echo -e "\n4. Slow Queries:"
psql -U postgres -c "
SELECT 
    query,
    calls,
    mean_time,
    total_time
FROM pg_stat_statements 
ORDER BY mean_time DESC 
LIMIT 5;
"

# 检查锁
echo -e "\n5. Lock Status:"
psql -U postgres -c "
SELECT 
    mode,
    count(*) as lock_count
FROM pg_locks 
GROUP BY mode
ORDER BY lock_count DESC;
"

echo -e "\n=== Health Check Complete ==="
```

##### 性能监控脚本

```
#!/bin/bash
# postgres_performance_monitor.sh

LOG_FILE="/var/log/postgres_performance.log"
DATE=$(date '+%Y-%m-%d %H:%M:%S')

echo "[$DATE] Performance Check" >> $LOG_FILE

# 检查缓存命中率
CACHE_HIT=$(psql -U postgres -t -c "
SELECT round(100.0 * sum(blks_hit) / (sum(blks_hit) + sum(blks_read)), 2)
FROM pg_stat_database 
WHERE datname NOT IN ('template0', 'template1', 'postgres');
")

echo "[$DATE] Cache Hit Ratio: $CACHE_HIT%" >> $LOG_FILE

# 检查活跃连接
ACTIVE_CONNECTIONS=$(psql -U postgres -t -c "
SELECT count(*) FROM pg_stat_activity WHERE state = 'active';
")

echo "[$DATE] Active Connections: $ACTIVE_CONNECTIONS" >> $LOG_FILE

# 检查数据库大小
DB_SIZE=$(psql -U postgres -t -c "
SELECT pg_size_pretty(sum(pg_database_size(datname)))
FROM pg_database 
WHERE datname NOT IN ('template0', 'template1', 'postgres');
")

echo "[$DATE] Total Database Size: $DB_SIZE" >> $LOG_FILE

# 检查 WAL 日志大小
WAL_SIZE=$(psql -U postgres -t -c "
SELECT pg_size_pretty(pg_wal_lsn_diff(pg_current_wal_lsn(), '0/0'));
")

echo "[$DATE] WAL Size: $WAL_SIZE" >> $LOG_FILE

echo "[$DATE] Performance Check Complete" >> $LOG_FILE
echo "---" >> $LOG_FILE
```

#### 紧急恢复程序

##### 数据库恢复

```
# 1. 停止 PostgreSQL 服务
sudo systemctl stop postgresql

# 2. 备份当前数据目录
sudo cp -r /var/lib/postgresql/15/main /var/lib/postgresql/15/main.backup.$(date +%Y%m%d_%H%M%S)

# 3. 从备份恢复
sudo -u postgres pg_restore -d your_database /path/to/backup.dump

# 4. 启动服务
sudo systemctl start postgresql

# 5. 验证数据
psql -U postgres -d your_database -c "SELECT count(*) FROM your_table;"
```

##### 配置恢复

```
# 恢复配置文件
sudo cp /etc/postgresql/15/main/postgresql.conf.backup /etc/postgresql/15/main/postgresql.conf
sudo cp /etc/postgresql/15/main/pg_hba.conf.backup /etc/postgresql/15/main/pg_hba.conf

# 重启服务
sudo systemctl restart postgresql
```

---

### 总结与最佳实践

#### 迁移检查清单

##### 迁移前准备

- 评估现有 MySQL 数据库结构和数据量
- 选择合适的 PostgreSQL 版本
- 准备测试环境
- 制定回滚计划
- 培训团队成员

##### 迁移过程

- 安装和配置 PostgreSQL
- 创建用户和权限
- 迁移表结构
- 迁移数据
- 迁移存储过程和函数
- 更新应用程序连接配置
- 执行功能测试
- 执行性能测试

##### 迁移后优化

- 配置监控系统
- 优化查询性能
- 调整配置参数
- 建立备份策略
- 制定维护计划

#### 关键成功因素

1. **充分测试**：在迁移前进行全面的功能测试和性能测试
2. **渐进迁移**：考虑分阶段迁移，降低风险
3. **监控先行**：建立完善的监控体系
4. **团队培训**：确保团队了解 PostgreSQL 的特性和最佳实践
5. **文档维护**：保持配置和流程文档的更新

#### 长期维护建议

1. **定期监控**：每周检查系统健康状态
2. **性能调优**：根据实际负载调整配置参数
3. **版本升级**：制定 PostgreSQL 版本升级计划
4. **扩展评估**：定期评估新的扩展和功能
5. **安全审计**：定期进行安全配置审计

通过遵循本指南，高级后端开发人员可以更顺利地完成从 MySQL 到 PostgreSQL 的迁移，并充分发挥 PostgreSQL 的强大功能。记住，迁移是一个持续的过程，需要不断的监控、优化和改进。
