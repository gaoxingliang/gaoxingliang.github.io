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

- **零依赖、高 token 效率**：仅两个核心 MCP 工具，最大化上下文窗口
- **多数据库支持**：可同时连接多种数据库
- **安全防护**：只读模式、行数限制、查询超时
- **安全访问**：支持 SSH 隧道和 SSL/TLS 加密
- **内置工作台**：Web 界面执行查询和自定义工具

核心 MCP 工具：

- `execute_sql`：执行 SQL 查询，支持事务和安全控制
- `search_objects`：搜索和浏览数据库 schema、表、列、索引和存储过程

---

## 一、Docker 部署 DBHub

### 1. 使用 Docker Run

**连接 PostgreSQL 示例：**

```bash
docker run --rm --init \
  --name dbhub \
  --publish 8080:8080 \
  bytebase/dbhub \
  --transport http \
  --port 8080 \
  --dsn "postgres://user:password@localhost:5432/dbname?sslmode=disable"
```

**Demo 模式（用于测试，无需真实数据库）：**

```bash
docker run --rm --init \
  --name dbhub \
  --publish 8080:8080 \
  bytebase/dbhub \
  --transport http \
  --port 8080 \
  --demo
```

> 若数据库在宿主机上，Docker 容器内应使用 `host.docker.internal` 替代 `localhost`：
>
> `--dsn "postgres://user:password@host.docker.internal:5432/dbname"`

### 2. 使用 Docker Compose

在 `docker-compose.yml` 中添加 DBHub 服务：

```yaml
services:
  dbhub:
    image: bytebase/dbhub:latest
    container_name: dbhub
    ports:
      - "8080:8080"
    environment:
      - DBHUB_LOG_LEVEL=info
    command:
      - --transport
      - http
      - --port
      - "8080"
      - --dsn
      - "postgres://user:password@database:5432/dbname"
    depends_on:
      - database

  database:
    image: postgres:15-alpine
    environment:
      POSTGRES_PASSWORD: password
      POSTGRES_DB: dbname
```

启动服务：

```bash
docker-compose up -d
```

部署成功后，DBHub 会在 `http://localhost:8080` 提供：

- **工作台**：`http://localhost:8080/`
- **MCP 端点**：`http://localhost:8080/mcp`

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
      "url": "http://localhost:8080/mcp"
    }
  }
}
```

### 方式二：stdio 连接（本地直连）

若希望 Cursor 直接启动 DBHub 进程，使用 stdio：

**Windows** - 编辑 `%USERPROFILE%\.cursor\mcp.json`：

```json
{
  "mcpServers": {
    "dbhub": {
      "command": "npx",
      "args": [
        "@bytebase/dbhub@latest",
        "--transport",
        "stdio",
        "--dsn",
        "postgres://user:password@localhost:5432/dbname"
      ]
    }
  }
}
```

**Demo 模式（无需数据库）：**

```json
{
  "mcpServers": {
    "dbhub": {
      "command": "npx",
      "args": [
        "@bytebase/dbhub@latest",
        "--transport",
        "stdio",
        "--demo"
      ]
    }
  }
}
```

### 项目级配置

若希望配置仅对当前项目生效，在项目根目录创建 `.cursor/mcp.json`：

```json
{
  "mcpServers": {
    "project-db": {
      "command": "npx",
      "args": [
        "@bytebase/dbhub@latest",
        "--transport",
        "stdio",
        "--config",
        "${workspaceFolder}/dbhub.toml"
      ]
    }
  }
}
```

### 敏感信息处理

建议使用环境变量，避免在配置中写死密码：

```json
{
  "mcpServers": {
    "dbhub": {
      "command": "npx",
      "args": [
        "@bytebase/dbhub@latest",
        "--transport",
        "stdio",
        "--dsn",
        "${DATABASE_URL}"
      ]
    }
  }
}
```

---

## 三、验证与使用

1. 保存 `mcp.json` 后，重启 Cursor 或重新加载窗口
2. 在 **Cursor 设置 → Tools & MCP** 中确认 DBHub 已加载
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
