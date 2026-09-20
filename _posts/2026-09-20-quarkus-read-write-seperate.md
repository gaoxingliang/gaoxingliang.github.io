---
layout: post
title: "quarkus数据库读写分离代码"
date: 2026-09-20 10:00:00 +0800
author: ed
description: "使用quarkus 、quarkus native做数据库读写分离的代码"
category: 开发
tags:
  - quarkus
  - quarkus native
  - 数据库
  - 读写分离
---

# Quarkus 数据库读写分离实现指南

## 概述

本文介绍如何在 Quarkus 项目中实现数据库读写分离，使用 **EntityManagerFactory + 读数据源** 方案，支持 Native 编译，无需手动处理 JDBC。

### 为什么需要读写分离？

- **提升性能**：读操作分流到只读副本，减轻主库压力
- **提高可用性**：读副本可以水平扩展
- **优化资源利用**：主库专注处理写操作和事务

### 方案特点

✅ **简洁优雅** - 使用 Lambda 表达式，无需手动管理 JDBC  
✅ **Native 兼容** - 完全兼容 Quarkus Native 编译  
✅ **自动降级** - 未启用时自动使用主库  
✅ **类型安全** - 使用 JPQL 而非原生 SQL  
✅ **零侵入** - 写操作无需修改

## 架构设计

### 为什么不用多 Persistence Unit？

Quarkus 的 Panache 实体不支持附加到多个 Persistence Unit，因此我们采用 **数据源级别** 的读写分离：

- **默认数据源**：用于所有写操作和事务（主库）
- **读数据源**：用于只读查询操作（只读副本）
- **单个 PU**：所有实体只附加到默认 PU

### 核心原理

通过 `EntityManagerFactory` 创建临时 `EntityManager`，并在创建时指定使用读数据源连接。

```
┌─────────────┐
│ Repository  │
└──────┬──────┘
       │ inject
       ▼
┌─────────────────────┐
│ ReadDataSourceHelper│
└──────┬──────────────┘
       │ creates
       ▼
┌─────────────────────┐      ┌──────────────┐
│  EntityManager      │─────▶│ Read DataSource │──▶ 只读副本
└─────────────────────┘      └──────────────┘

┌─────────────────────┐      ┌──────────────┐
│  Panache (default)  │─────▶│Default DataSource│──▶ 主库
└─────────────────────┘      └──────────────┘
```

## 实现步骤

### 1. 配置数据源

在 `application.properties` 中配置两个数据源：

```properties
# ============================================================================
# 默认数据源（主库/写操作）
# ============================================================================
quarkus.datasource.db-kind=postgresql
quarkus.datasource.jdbc.url=${DB_URL:jdbc:postgresql://primary.db:5432/mydb}
quarkus.datasource.username=${DB_USERNAME:app_writer}
quarkus.datasource.password=${DB_PASSWORD:write_password}

# 连接池配置
quarkus.datasource.jdbc.min-size=${JDBC_MIN:2}
quarkus.datasource.jdbc.max-size=${JDBC_MAX:10}
quarkus.datasource.jdbc.acquisition-timeout=10s
quarkus.datasource.jdbc.max-lifetime=10m

# ============================================================================
# 读数据源（只读副本/读操作）
# ============================================================================
quarkus.datasource.read.db-kind=postgresql
quarkus.datasource.read.jdbc.url=${DB_READ_URL:${DB_URL}}
quarkus.datasource.read.username=${DB_READ_USERNAME:${DB_USERNAME}}
quarkus.datasource.read.password=${DB_READ_PASSWORD:${DB_PASSWORD}}

# 读数据源连接池配置
quarkus.datasource.read.jdbc.min-size=${JDBC_READ_MIN:2}
quarkus.datasource.read.jdbc.max-size=${JDBC_READ_MAX:10}
quarkus.datasource.read.jdbc.acquisition-timeout=10s
quarkus.datasource.read.jdbc.max-lifetime=10m

# ============================================================================
# 读写分离开关
# ============================================================================
read-write-separation.enabled=${READ_WRITE_SEPARATION_ENABLED:false}

# ============================================================================
# Hibernate 配置（单个 PU）
# ============================================================================
quarkus.hibernate-orm.database.generation=none
quarkus.hibernate-orm.database.default-schema=${DB_SCHEMA:public}
quarkus.hibernate-orm.log.sql=${LOG_SQL:false}
quarkus.hibernate-orm.jdbc.timezone=Asia/Shanghai
```

### 2. 创建 ReadDataSourceHelper

创建辅助类 `ReadDataSourceHelper.java`：

```java
package com.example.datasource;

import io.agroal.api.AgroalDataSource;
import io.quarkus.agroal.DataSource;
import io.quarkus.runtime.StartupEvent;
import jakarta.enterprise.context.ApplicationScoped;
import jakarta.enterprise.event.Observes;
import jakarta.inject.Inject;
import jakarta.persistence.EntityManager;
import jakarta.persistence.EntityManagerFactory;
import org.eclipse.microprofile.config.inject.ConfigProperty;
import org.jboss.logging.Logger;

import java.util.HashMap;
import java.util.Map;
import java.util.function.Function;

/**
 * 读写分离辅助类
 * 
 * 提供在读数据源上执行查询的能力，使用 EntityManager + JPQL，
 * 无需手动处理 JDBC、PreparedStatement 或 ResultSet。
 */
@ApplicationScoped
public class ReadDataSourceHelper {
    
    private static final Logger LOG = Logger.getLogger(ReadDataSourceHelper.class);
    
    @Inject
    EntityManagerFactory emf;
    
    @Inject
    @DataSource("read")
    AgroalDataSource readDataSource;
    
    @Inject
    AgroalDataSource defaultDataSource;
    
    @ConfigProperty(name = "read-write-separation.enabled", defaultValue = "false")
    boolean enabled;
    
    @ConfigProperty(name = "quarkus.datasource.read.jdbc.url", defaultValue = "")
    String readDbUrl;
    
    @ConfigProperty(name = "quarkus.datasource.jdbc.url")
    String defaultDbUrl;
    
    /**
     * 启动时打印读写分离状态
     */
    void onStart(@Observes StartupEvent ev) {
        if (enabled) {
            LOG.infof("========================================");
            LOG.infof("✅ READ-WRITE SEPARATION ENABLED");
            LOG.infof("========================================");
            LOG.infof("📖 Read DataSource URL:  %s", maskPassword(readDbUrl));
            LOG.infof("✏️  Write DataSource URL: %s", maskPassword(defaultDbUrl));
            LOG.infof("========================================");
        } else {
            LOG.infof("========================================");
            LOG.infof("ℹ️  READ-WRITE SEPARATION DISABLED");
            LOG.infof("📚 All operations use default datasource: %s", maskPassword(defaultDbUrl));
            LOG.infof("========================================");
        }
    }
    
    /**
     * 遮蔽 JDBC URL 中的密码
     */
    private String maskPassword(String url) {
        if (url == null || url.isEmpty()) {
            return "(not configured)";
        }
        return url.replaceAll("password=([^&]+)", "password=***");
    }
    
    /**
     * 检查读写分离是否启用
     */
    public boolean isEnabled() {
        return enabled;
    }
    
    /**
     * 在读数据源上执行查询操作
     * 
     * @param operation 要执行的操作，接收 EntityManager 参数
     * @return 操作结果
     */
    public <T> T executeRead(Function<EntityManager, T> operation) {
        if (!enabled) {
            // 读写分离未启用，使用默认数据源
            if (LOG.isTraceEnabled()) {
                LOG.trace("Read-write separation disabled, using default datasource");
            }
            EntityManager em = emf.createEntityManager();
            try {
                return operation.apply(em);
            } finally {
                em.close();
            }
        }
        
        // 创建连接到读数据源的 EntityManager
        if (LOG.isDebugEnabled()) {
            LOG.debug("Executing read operation on read datasource");
        }
        
        Map<String, Object> props = new HashMap<>();
        props.put("javax.persistence.nonJtaDataSource", readDataSource);
        
        EntityManager em = emf.createEntityManager(props);
        try {
            T result = operation.apply(em);
            if (LOG.isTraceEnabled()) {
                LOG.trace("Read operation completed successfully");
            }
            return result;
        } catch (Exception e) {
            LOG.warnf(e, "Error executing read operation on read datasource");
            throw e;
        } finally {
            em.close();
        }
    }
    
    /**
     * 在读数据源上执行查询，失败时自动降级到主库
     * 
     * @param operation 要执行的操作
     * @return 操作结果
     */
    public <T> T executeReadWithFallback(Function<EntityManager, T> operation) {
        try {
            return executeRead(operation);
        } catch (Exception e) {
            LOG.warnf(e, "Read operation failed on read datasource, falling back to default datasource");
            // 降级到默认数据源
            EntityManager em = emf.createEntityManager();
            try {
                T result = operation.apply(em);
                LOG.info("Read operation succeeded on default datasource (fallback)");
                return result;
            } finally {
                em.close();
            }
        }
    }
}
```

### 3. 创建 @ReadOnly 标记注解（可选）

用于文档化只读操作：

```java
package com.example.datasource;

import java.lang.annotation.ElementType;
import java.lang.annotation.Retention;
import java.lang.annotation.RetentionPolicy;
import java.lang.annotation.Target;

/**
 * 标记注解，表示方法执行只读操作
 * 
 * 此注解仅用于文档和代码可读性，不影响运行时行为。
 */
@Target({ElementType.METHOD, ElementType.TYPE})
@Retention(RetentionPolicy.SOURCE)
public @interface ReadOnly {
    /**
     * 操作描述
     */
    String value() default "";
}
```

### 4. 在 Repository 中使用

#### 示例 1：简单查询

```java
package com.example.repository;

import com.example.datasource.ReadDataSourceHelper;
import com.example.entity.User;
import io.quarkus.hibernate.orm.panache.PanacheRepositoryBase;
import jakarta.enterprise.context.ApplicationScoped;
import jakarta.inject.Inject;
import jakarta.transaction.Transactional;

import java.util.List;
import java.util.Optional;

@ApplicationScoped
public class UserRepository implements PanacheRepositoryBase<User, Long> {

    @Inject
    ReadDataSourceHelper readHelper;

    /**
     * 查询所有用户（读操作）
     */
    @Transactional(Transactional.TxType.SUPPORTS)
    public List<User> listAllUsers() {
        return readHelper.executeRead(em ->
            em.createQuery("FROM User ORDER BY id", User.class)
              .getResultList()
        );
    }
    
    /**
     * 根据 ID 查询用户（读操作）
     */
    @Transactional(Transactional.TxType.SUPPORTS)
    public Optional<User> findUserById(Long id) {
        return readHelper.executeRead(em ->
            em.createQuery("FROM User WHERE id = :id", User.class)
              .setParameter("id", id)
              .getResultList()
              .stream()
              .findFirst()
        );
    }

    /**
     * 创建用户（写操作 - 使用默认 Panache）
     */
    @Transactional
    public void createUser(User user) {
        persist(user);
    }
    
    /**
     * 更新用户（写操作 - 使用默认 Panache）
     */
    @Transactional
    public User updateUser(User user) {
        return getEntityManager().merge(user);
    }
}
```

#### 示例 2：复杂查询

```java
/**
 * 分页查询订单（读操作）
 */
@Transactional(Transactional.TxType.SUPPORTS)
public List<Order> findOrders(Long userId, OrderStatus status, 
                               Instant startTime, Instant endTime,
                               int offset, int limit) {
    return readHelper.executeRead(em -> {
        StringBuilder jpql = new StringBuilder("FROM Order o WHERE o.userId = :userId");
        
        if (status != null) {
            jpql.append(" AND o.status = :status");
        }
        
        if (startTime != null) {
            jpql.append(" AND o.createdAt >= :startTime");
        }
        
        if (endTime != null) {
            jpql.append(" AND o.createdAt < :endTime");
        }
        
        jpql.append(" ORDER BY o.createdAt DESC");
        
        var query = em.createQuery(jpql.toString(), Order.class)
                .setParameter("userId", userId)
                .setFirstResult(offset)
                .setMaxResults(limit);
        
        if (status != null) {
            query.setParameter("status", status);
        }
        
        if (startTime != null) {
            query.setParameter("startTime", startTime);
        }
        
        if (endTime != null) {
            query.setParameter("endTime", endTime);
        }
        
        return query.getResultList();
    });
}

/**
 * 统计订单数量（读操作）
 */
@Transactional(Transactional.TxType.SUPPORTS)
public long countOrders(Long userId, OrderStatus status) {
    return readHelper.executeRead(em -> {
        StringBuilder jpql = new StringBuilder("SELECT COUNT(o) FROM Order o WHERE o.userId = :userId");
        
        if (status != null) {
            jpql.append(" AND o.status = :status");
        }
        
        var query = em.createQuery(jpql.toString(), Long.class)
                .setParameter("userId", userId);
        
        if (status != null) {
            query.setParameter("status", status);
        }
        
        return query.getSingleResult();
    });
}
```

#### 示例 3：聚合查询

```java
/**
 * 统计用户总消费金额（读操作）
 */
@Transactional(Transactional.TxType.SUPPORTS)
public BigDecimal getTotalSpent(Long userId) {
    return readHelper.executeRead(em -> {
        BigDecimal result = em.createQuery(
                "SELECT COALESCE(SUM(o.amount), 0) FROM Order o " +
                "WHERE o.userId = :userId AND o.status = :status",
                BigDecimal.class)
            .setParameter("userId", userId)
            .setParameter("status", OrderStatus.COMPLETED)
            .getSingleResult();
        
        return result != null ? result : BigDecimal.ZERO;
    });
}
```


## 环境配置

### 开发环境（单库）

```bash
# .env 或环境变量
DB_URL=jdbc:postgresql://localhost:5432/mydb
DB_USERNAME=postgres
DB_PASSWORD=password

# 不启用读写分离
READ_WRITE_SEPARATION_ENABLED=false
```

### 生产环境（读写分离）

```bash
# 主库配置
DB_URL=jdbc:postgresql://primary.db.internal:5432/mydb
DB_USERNAME=app_writer
DB_PASSWORD=write_password_here

# 只读副本配置
DB_READ_URL=jdbc:postgresql://replica.db.internal:5432/mydb
DB_READ_USERNAME=app_reader
DB_READ_PASSWORD=read_password_here

# 启用读写分离
READ_WRITE_SEPARATION_ENABLED=true

# 可选：连接池配置
JDBC_MIN=5
JDBC_MAX=20
JDBC_READ_MIN=10
JDBC_READ_MAX=50
```

### Docker Compose 示例

```yaml
version: '3.8'

services:
  app:
    image: myapp:latest
    environment:
      # 主库
      DB_URL: jdbc:postgresql://postgres-primary:5432/mydb
      DB_USERNAME: app_writer
      DB_PASSWORD: write_pass
      
      # 只读副本
      DB_READ_URL: jdbc:postgresql://postgres-replica:5432/mydb
      DB_READ_USERNAME: app_reader
      DB_READ_PASSWORD: read_pass
      
      # 启用读写分离
      READ_WRITE_SEPARATION_ENABLED: "true"
    depends_on:
      - postgres-primary
      - postgres-replica

  postgres-primary:
    image: postgres:15
    environment:
      POSTGRES_DB: mydb
      POSTGRES_USER: postgres
      POSTGRES_PASSWORD: postgres
    volumes:
      - primary-data:/var/lib/postgresql/data

  postgres-replica:
    image: postgres:15
    environment:
      POSTGRES_DB: mydb
      POSTGRES_USER: postgres
      POSTGRES_PASSWORD: postgres
    volumes:
      - replica-data:/var/lib/postgresql/data

volumes:
  primary-data:
  replica-data:
```

## 启动日志

### 启用读写分离时

```
========================================
✅ READ-WRITE SEPARATION ENABLED
========================================
📖 Read DataSource URL:  jdbc:postgresql://replica.db:5432/mydb
✏️  Write DataSource URL: jdbc:postgresql://primary.db:5432/mydb
========================================
```

### 未启用读写分离时

```
========================================
ℹ️  READ-WRITE SEPARATION DISABLED
📚 All operations use default datasource: jdbc:postgresql://localhost:5432/mydb
========================================
```

## 日志配置

在 `application.properties` 中配置日志级别：

```properties
# 查看读写分离的详细日志
quarkus.log.category."com.example.datasource".level=DEBUG

# 或者更详细的 TRACE 级别
quarkus.log.category."com.example.datasource".level=TRACE

# 查看 SQL 语句
quarkus.hibernate-orm.log.sql=true
```

## 监控与健康检查

### 健康检查端点

Quarkus 自动为数据源提供健康检查：

```bash
# 检查应用健康状态
curl http://localhost:8080/q/health

# 响应示例
{
  "status": "UP",
  "checks": [
    {
      "name": "Database connections health check",
      "status": "UP",
      "data": {
        "default": "UP",
        "read": "UP"
      }
    }
  ]
}
```

### Prometheus 指标

连接池指标会自动暴露：

```bash
# 访问指标端点
curl http://localhost:8080/q/metrics

# 连接池指标示例
agroal_active_count{datasource="default"} 2
agroal_available_count{datasource="default"} 8
agroal_max_used_count{datasource="default"} 5

agroal_active_count{datasource="read"} 5
agroal_available_count{datasource="read"} 45
agroal_max_used_count{datasource="read"} 12
```

## 性能优化建议

### 1. 连接池大小调整

根据实际负载调整连接池大小：

```properties
# 主库连接池（写操作较少）
quarkus.datasource.jdbc.min-size=2
quarkus.datasource.jdbc.max-size=10

# 只读副本连接池（读操作较多）
quarkus.datasource.read.jdbc.min-size=10
quarkus.datasource.read.jdbc.max-size=50
```

### 2. 查询优化

为频繁查询的字段添加索引：

```sql
-- 为常用查询字段添加索引
CREATE INDEX idx_orders_user_id ON orders(user_id);
CREATE INDEX idx_orders_created_at ON orders(created_at);
CREATE INDEX idx_orders_status ON orders(status);
```

### 3. 读副本延迟处理

注意主从复制延迟，对于需要强一致性的查询，直接使用主库：

```java
/**
 * 需要强一致性的查询，不使用读数据源
 */
@Transactional
public Order getOrderWithConsistency(Long orderId) {
    // 在事务内查询，自动使用主库
    return findById(orderId);
}
```

### 4. 缓存策略

配合 Redis 等缓存减少数据库查询：

```java
@Inject
@CacheName("user-cache")
Cache cache;

public User getUserCached(Long userId) {
    return cache.get(userId, id -> 
        userRepository.findUserById(id).orElse(null)
    );
}
```

## 故障处理

### 常见问题

#### 1. 读数据源连接失败

**症状**：日志显示 "Error executing read operation on read datasource"

**解决方案**：
- 检查 `DB_READ_URL` 配置是否正确
- 验证读副本数据库是否可访问
- 检查网络和防火墙配置
- 使用 `executeReadWithFallback()` 自动降级

#### 2. 数据不一致

**症状**：读取到旧数据

**原因**：主从复制延迟

**解决方案**：
- 监控主从复制延迟
- 关键业务在事务内查询（使用主库）
- 设置合理的复制延迟告警阈值

#### 3. 连接池耗尽

**症状**：`Unable to acquire JDBC Connection`

**解决方案**：
- 增加连接池大小
- 检查是否有连接泄漏
- 优化慢查询



## 最佳实践

### 1. 明确区分读写操作

在设计 API 时明确标识读写操作：

```java
// ✅ 好的做法
@GET  // 读操作
public Response listUsers() { ... }

@POST // 写操作
public Response createUser(User user) { ... }

// ❌ 避免
@GET
@Path("/complex")  // GET 请求不应该有副作用
public Response doComplexOperation() {
    // 内部包含写操作 - 不符合 REST 规范
}
```

### 2. 事务边界管理

```java
// ✅ 读操作使用 SUPPORTS
@Transactional(TxType.SUPPORTS)
public List<User> listUsers() {
    return readHelper.executeRead(...);
}

// ✅ 写操作使用 REQUIRED
@Transactional
public void createUser(User user) {
    persist(user);
}
```

### 3. 降级策略

对于关键查询，使用自动降级：

```java
public List<User> criticalQuery() {
    return readHelper.executeReadWithFallback(em ->
        em.createQuery("FROM User WHERE critical = true", User.class)
          .getResultList()
    );
}
```

### 4. 监控和告警

- 监控读副本的复制延迟
- 监控连接池使用率
- 设置读副本故障告警
- 记录降级事件

## 总结

本方案实现了 Quarkus 项目的数据库读写分离，具有以下优势：

| 特性 | 说明 |
|------|------|
| 🎯 简洁优雅 | 使用 Lambda 表达式，无需手动 JDBC |
| 🚀 Native 兼容 | 完全兼容 Quarkus Native 编译 |
| 🔄 自动降级 | 读库故障时自动使用主库 |
| 📊 类型安全 | JPQL 查询，编译时检查 |
| 🛡️ 零侵入 | 写操作无需修改 |
| 📝 可观测 | 详细的启动和运行时日志 |
| ⚡ 高性能 | 分流读操作，提升整体性能 |

通过合理的配置和使用，可以显著提升应用的性能和可用性。

## 参考资料

- [Quarkus Datasource Guide](https://quarkus.io/guides/datasource)
- [Quarkus Hibernate ORM Guide](https://quarkus.io/guides/hibernate-orm)
- [Quarkus Native Guide](https://quarkus.io/guides/building-native-image)
- [PostgreSQL Replication](https://www.postgresql.org/docs/current/high-availability.html)

---

