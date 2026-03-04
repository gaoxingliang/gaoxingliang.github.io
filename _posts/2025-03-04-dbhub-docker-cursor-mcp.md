---
layout: post
title: "DBHub 的 Docker 部署与 Cursor 中的 MCP 设置"
date: 2025-03-04 10:00:00 +0800
author: gaoxingliang
description: "介绍如何使用 Docker 部署 DBHub 数据库 MCP 服务，并在 Cursor 编辑器中完成 MCP 配置，实现 AI 与数据库的深度集成。"
---

DBHub 是由 Bytebase 开发的通用数据库 MCP（Model Context Protocol）服务器，可以让 AI 工具通过统一接口连接并查询多种数据库。本文将介绍如何通过 Docker 部署 DBHub，并在 Cursor 中完成 MCP 配置。

## 什么是 DBHub？

DBHub 支持 PostgreSQL、MySQL、SQL Server、MariaDB 和 SQLite 等多种数据库，主要特性包括：

核心 MCP 工具：

- `execute_sql`：执行 SQL 查询，支持事务和安全控制
- `search_objects`：搜索和浏览数据库 schema、表、列、索引和存储过程

---

## 一、Docker 部署 DBHub

### 1. 使用 Docker Run

**连接 mysql示例：**

```bash
docker run -d --restart always --init \
  --name dbhub \
  --publish 7080:7080 \
  bytebase/dbhub \
  --transport http \
  --port 7080 \
  --dsn "mysql://readonly_admin:your_strong_password@192.168.102.207:3307/yourdb"

```



创建mysql使用的只读用户：

```mysql
-- 1. 创建用户（替换 your_password）
CREATE USER 'readonly_admin'@'%' IDENTIFIED BY 'your_strong_password';

-- 2. 授予全局 SELECT 权限（所有库、所有表可查）
GRANT SELECT ON *.* TO 'readonly_admin'@'%';

-- 3. 授予元数据查看权限（关键！）
GRANT
    SHOW DATABASES,
        SHOW VIEW,
        PROCESS,          -- 查看当前运行的查询（用于 performance_schema）
        REPLICATION CLIENT -- 查看 binlog 位置（可选）
        ON *.* TO 'readonly_admin'@'%';

-- 4. （可选）允许执行存储过程（但不能修改）
GRANT EXECUTE ON *.* TO 'readonly_admin'@'%';

-- 5. 刷新权限
FLUSH PRIVILEGES;
```



部署成功后，DBHub 会在 `http://localhost:7080` 提供：

- **工作台**：`http://localhost:7080/`
- **MCP 端点**：`http://localhost:7080/mcp`

---

## 二、Cursor 中的 MCP 配置

Cursor 支持两种连接方式：**stdio**（本地）和 **HTTP**（远程/共享）。

### 方式一：HTTP 连接（推荐，配合 Docker）

当 DBHub 以 HTTP 方式运行（如 Docker 部署）时，在 Cursor 中配置：

**Windows** - 编辑 `%USERPROFILE%\.cursor\mcp.json`：

**macOS/Linux** - 编辑 `~/.cursor/mcp.json`：

```json
{
  "mcpServers": {
    "dbhub": {
      "url": "http://localhost:7080/mcp"
    }
  }
}
```





---

## 三、验证与使用

1. 保存 `mcp.json` 后，重启 Cursor 或重新加载窗口

2. 在 **Cursor 设置 → Tools & MCP** 中确认 DBHub 已加载

   ![MCP 设置界面]({{ '/assets/images/posts/2025-03-04-dbhub-docker-cursor-mcp/image-20260304135751925.png' | relative_url }})

3. 在对话中可尝试：
   - 「数据库里有哪些 schema？」
   - 「public schema 下有哪些表？」
   - 「查询薪资最高的 5 名员工」

AI 会通过 DBHub 的 MCP 工具访问数据库并执行查询。

---

## 四、参考链接

- [DBHub 官方文档](https://dbhub.ai/)
- [DBHub GitHub](https://github.com/bytebase/dbhub)
- [Cursor MCP 文档](https://cursor.com/docs/context/mcp)
