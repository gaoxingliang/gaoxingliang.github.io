---
layout: post
title: "非企业版 Metabase 自动登录跳转实现指南"
date: 2026-06-30 10:00:00 +0800
author: ed
description: "通过直接操作数据库实现 Metabase 开源版的自动登录功能"
category: 开发
tags:
  - Metabase
  - SSO
  - Spring Boot
  - 数据库
---

## 背景

Metabase 是一款流行的开源数据可视化工具，但其单点登录（SSO）功能仅在企业版中提供。对于使用开源版本的团队，如果希望将 Metabase 集成到现有系统中并实现自动登录，就需要通过其他方式来实现。

本文介绍一种通过直接操作 Metabase 数据库来实现自动登录的方案，适用于非企业版 Metabase。在v0.54.9上测试通过。

## 实现原理

Metabase 的登录状态通过 Cookie 来维护，核心是 `metabase.SESSION` 这个 Cookie。该 Cookie 的值对应数据库中 `core_session` 表的记录。

实现自动登录的核心思路是：
1. 获取当前系统的登录用户信息
2. 在 Metabase 数据库中查找或创建对应的用户
3. 生成一个 session 记录并写入 `core_session` 表
4. 将 session key 写入 `metabase.SESSION` Cookie
5. 重定向到 Metabase 页面

这样，当用户被重定向到 Metabase 时，浏览器会携带有效的 session Cookie，Metabase 会认为用户已登录。

## 数据库结构说明

涉及的 Metabase 数据库表：

### core_user 表
存储用户信息，主要字段：
- `id`: 用户 ID
- `email`: 邮箱（唯一标识）
- `first_name`: 名字
- `last_name`: 姓氏
- `password`: 密码哈希
- `password_salt`: 密码盐值
- `is_active`: 是否激活
- `is_superuser`: 是否超级管理员

### core_session 表
存储会话信息，主要字段：
- `id`: session ID
- `user_id`: 关联的用户 ID
- `key_hashed`: session key 的哈希值
- `created_at`: 创建时间

### permissions_group_membership 表
用户组成员关系表，主要字段：
- `user_id`: 用户 ID
- `group_id`: 用户组 ID
- `is_group_manager`: 是否为组管理员

## 完整实现代码

### 1. 配置文件

在 `application.yml` 或 `application.properties` 中添加配置：

```yaml
metabase:
  # Metabase 跳转目标地址
  redirectUrl: http://metabase.yourdomain.com
  
  # Cookie 的 Domain 设置（根域名，用于跨子域名共享）
  cookie:
    domain: yourdomain.com
  
  # 默认密码（用户首次创建时使用）
  defaultPass: your-default-password
  
  # 创建的用户组 ID（根据实际情况配置）
  # 1 -- 一般是所有人
  # 2 --- 一般是管理员组
  qfUserGroupId: 2
  
  # Metabase 数据库连接配置
  datasource:
    url: jdbc:postgresql://localhost:5432/metabase
    username: metabase_user
    password: metabase_password
    driverClassName: org.postgresql.Driver
```

### 2. Metabase 数据源配置类

```java

import lombok.Data;
import org.springframework.boot.context.properties.ConfigurationProperties;
import org.springframework.stereotype.Component;

@Data
@Component
@ConfigurationProperties(prefix = "metabase.datasource")
public class MetabaseDatasourceProperties {
    private String url;
    private String username;
    private String password;
    private String driverClassName;
}
```

### 3. Session 生成服务

```java

import com.scjk.risk.starter.v1.config.MetabaseDatasourceProperties;
import com.zaxxer.hikari.HikariDataSource;
import lombok.extern.slf4j.Slf4j;
import org.apache.commons.codec.digest.DigestUtils;
import org.apache.commons.lang.RandomStringUtils;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.security.crypto.bcrypt.BCrypt;
import org.springframework.stereotype.Service;

import javax.annotation.PostConstruct;
import java.security.NoSuchAlgorithmException;
import java.sql.Timestamp;
import java.time.Instant;
import java.util.UUID;

@Service
@Slf4j
public class MetabaseSessionGenerator {

    @Value("${metabase.defaultPass}")
    private String defaultPass;

    @Value("${metabase.qfUserGroupId}")
    private Integer qfUserGroupId;

    private JdbcTemplate metabaseJdbcTemplate;

    @Autowired
    MetabaseDatasourceProperties properties;

    @PostConstruct
    public void post() {
        // 初始化 Metabase 数据库连接池
        HikariDataSource ds = new HikariDataSource();
        ds.setJdbcUrl(properties.getUrl());
        ds.setUsername(properties.getUsername());
        ds.setPassword(properties.getPassword());
        if (properties.getDriverClassName() != null) {
            ds.setDriverClassName(properties.getDriverClassName());
        }
        ds.setMaximumPoolSize(5);
        ds.setAutoCommit(true);
        metabaseJdbcTemplate = new JdbcTemplate(ds);
    }

    /**
     * 生成 session key（UUID 格式）
     */
    public String generateSessionKey() {
        return UUID.randomUUID().toString();
    }

    /**
     * 生成 session ID（12 位随机字母）
     */
    public String generateSessionId() {
        return RandomStringUtils.randomAlphabetic(12);
    }

    /**
     * 对 session key 进行 SHA-512 哈希
     */
    public String hashSessionKey(String sessionKey) throws NoSuchAlgorithmException {
        return DigestUtils.sha512Hex(sessionKey);
    }

    /**
     * 创建 session 记录
     */
    private String createSession(int userId) throws NoSuchAlgorithmException {
        String sessionId = generateSessionId();
        String sessionKey = generateSessionKey();
        String keyHashed = hashSessionKey(sessionKey);
        Timestamp createdAt = Timestamp.from(Instant.now());

        metabaseJdbcTemplate.update(
                "INSERT INTO core_session (id, key_hashed, user_id, created_at) VALUES (?, ?, ?, ?)",
                sessionId, keyHashed, userId, createdAt
        );

        log.info("Session created successfully! Session ID: {}, userid={}, session key= {}, key hashed={}", 
                 sessionId, userId, sessionKey, keyHashed);
        return sessionKey;
    }

    /**
     * 根据邮箱查询用户 ID
     */
    private Integer getUserIdByEmail(String email) {
        return metabaseJdbcTemplate.query(
                "SELECT id FROM core_user WHERE email = ? and is_active = true ",
                rs -> rs.next() ? rs.getInt("id") : null,
                email
        );
    }

    /**
     * 创建新用户
     */
    private Integer createUser(String email, String username) throws NoSuchAlgorithmException {
        String firstName = email.substring(0, email.indexOf("@"));
        if (username == null) {
            username = firstName;
        }

        // 生成密码盐值和密码哈希
        String passwordSalt = UUID.randomUUID().toString();
        String rawPassword = defaultPass;
        String saltedPassword = passwordSalt + rawPassword;
        String passwordHash = BCrypt.hashpw(saltedPassword, BCrypt.gensalt(10));
        
        Timestamp now = Timestamp.from(Instant.now());

        // 插入用户记录（注意：必须写入 password_salt，否则用户无法创建 SQL 查询）
        metabaseJdbcTemplate.update(
                "INSERT INTO core_user (email, first_name, last_name, password, password_salt, " +
                "date_joined, last_login, is_superuser, is_active) " +
                "VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)",
                email, username, "", passwordHash, passwordSalt, now, now, true, true
        );

        Integer userId = metabaseJdbcTemplate.queryForObject(
                "SELECT id FROM core_user WHERE email = ? and is_active=true ", 
                Integer.class, email);
        
        log.info("Created new Metabase user with email: {}, userId: {}", email, userId);
        return userId;
    }

    /**
     * 为指定邮箱和用户名创建 session
     * 如果用户不存在，则自动创建
     * 如果用户不在指定用户组，则自动添加
     */
    public String createSession(String email, String username) {
        try {
            // 1. 查找或创建用户
            Integer userId = getUserIdByEmail(email);
            if (userId == null) {
                log.info("User not found with email: {}, creating new user", email);
                userId = createUser(email, username);
            }
            
            // 2. 检查用户是否在指定用户组中，如果不在则添加
            Integer finalUserId = userId;
            Integer groupCount = metabaseJdbcTemplate.queryForObject(
                    "SELECT COUNT(*) FROM permissions_group_membership WHERE user_id = ? AND group_id = ?",
                    Integer.class, finalUserId, qfUserGroupId);
            
            if (groupCount == 0) {
                metabaseJdbcTemplate.update(
                        "INSERT INTO permissions_group_membership (user_id, group_id, is_group_manager) " +
                        "VALUES (?, ?, ?)",
                        finalUserId, qfUserGroupId, false);
                log.info("Added user with email: {} to group ID: {}", email, qfUserGroupId);
            }

            // 3. 创建 session
            return createSession(userId);
        } catch (Exception e) {
            log.error("Failed to create session for email: {}", email, e);
            throw new RuntimeException("Failed to create session for email: " + email, e);
        }
    }
}
```

### 4. 控制器实现

```java

import com.jeedev.msdp.base.entity.SysUser;
import com.jeedev.msdp.base.utils.CommonUtils;
import com.scjk.risk.starter.v1.service.impl.MetabaseSessionGenerator;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import javax.servlet.http.HttpServletResponse;

/**
 * Metabase 自动登录控制器
 */
@Slf4j
@RestController
@RequestMapping("/external-system/metabase")
public class MetabaseController {

    @Value("${metabase.redirectUrl}")
    private String redirectUrl;

    @Value("${metabase.cookie.domain}")
    String cookieDomain;

    @Autowired
    private CommonUtils commonUtils;

    @Autowired
    MetabaseSessionGenerator metabaseSessionGenerator;

    /**
     * 跳转到 Metabase 并自动登录
     * 前端直接访问这个接口，会自动重定向到 Metabase
     * 
     * 访问地址: GET /external-system/metabase/sso
     */
    @GetMapping("/sso")
    public void ssoLogin(HttpServletResponse response) {
        try {
            // 1. 获取当前登录用户
            SysUser user = commonUtils.getCurrLoginUser();
            String username = user.getLoginName();
            String email = user.getEmail();

            // 2. 生成 Metabase session key
            String sessionKey = metabaseSessionGenerator.createSession(email, username);

            // 3. 设置 Cookie 有效期（13 天）
            // Metabase 默认是 14 天，这里设置稍短一些
            int maxAge = 60 * 60 * 24 * 13;

            // 4. 拼接 Set-Cookie 头
            StringBuilder cookieHeader = new StringBuilder();
            cookieHeader.append("metabase.SESSION=").append(sessionKey)
                    .append("; Domain=.").append(cookieDomain)   // 根域名，跨子域名共享
                    .append("; Path=/")
                    .append("; HttpOnly")                        // 防止 XSS 攻击
                    .append("; SameSite=Lax")                   // 解决跨子域名跳转 Cookie 丢失
                    .append("; Max-Age=").append(maxAge);       // 有效期（秒）

            // 如果是 HTTPS 环境，建议添加 Secure 标记
            // cookieHeader.append("; Secure");

            // 5. 写入响应头
            response.setHeader("Set-Cookie", cookieHeader.toString());

            log.info("用户 {} 跳转到 Metabase，Session Key: {}", username, sessionKey);

            // 6. 重定向到 Metabase
            response.sendRedirect(redirectUrl);

        } catch (Exception e) {
            log.error("Metabase SSO 登录失败", e);
            try {
                response.sendError(HttpServletResponse.SC_INTERNAL_SERVER_ERROR, 
                                  "登录失败: " + e.getMessage());
            } catch (Exception ex) {
                log.error("发送错误响应失败", ex);
            }
        }
    }
}
```

## 使用方式

### 前端集成

在你的系统中添加一个链接或按钮，指向 SSO 接口：

```html
<a href="/external-system/metabase/sso" target="_blank">
  打开 Metabase
</a>
```

或使用 JavaScript 跳转：

```javascript
function openMetabase() {
  window.open('/external-system/metabase/sso', '_blank');
}
```

### 工作流程

1. 用户在你的系统中已登录
2. 用户点击"打开 Metabase"链接
3. 请求发送到后端 `/external-system/metabase/sso`
4. 后端生成 session 并设置 Cookie
5. 浏览器被重定向到 Metabase
6. Metabase 读取 Cookie，识别用户已登录

## 核心技术细节

### 1. Session Key 生成与验证

Metabase 使用 SHA-512 哈希算法存储 session key：
- 生成原始 session key（UUID）
- 对原始 key 进行 SHA-512 哈希
- 将哈希值存入数据库
- 将原始 key 写入 Cookie

当用户访问 Metabase 时，Metabase 会：
1. 从 Cookie 读取 session key
2. 计算其 SHA-512 哈希
3. 在 `core_session` 表中查找匹配的记录
4. 验证 session 是否有效（未过期）

### 2. 密码加密机制

用户密码使用 BCrypt 加密：
```java
String passwordSalt = UUID.randomUUID().toString();
String saltedPassword = passwordSalt + rawPassword;
String passwordHash = BCrypt.hashpw(saltedPassword, BCrypt.gensalt(10));
```

**重要提示**：必须同时保存 `password_salt`，否则用户无法在 Metabase 中创建 SQL 查询。

### 3. Cookie 设置说明

Cookie 设置的关键参数：

- **Domain**: 设置为根域名（如 `.yourdomain.com`），支持跨子域名共享
- **Path**: 设置为 `/`，对整个域名生效
- **HttpOnly**: 防止 JavaScript 访问，提高安全性
- **SameSite=Lax**: 允许跨站点 GET 请求携带 Cookie，解决跳转时 Cookie 丢失问题
- **Secure**: HTTPS 环境下建议启用
- **Max-Age**: 设置过期时间（秒），建议与 Metabase 默认的 14 天保持一致

### 4. Session 有效期

Metabase 的默认 session 有效期配置在 `src/metabase/config.clj` 中：

```clojure
:max-session-age "20160"  ; session length in minutes (14 days)
```

本实现中设置为 13 天，略短于默认值，提高安全性。

## 安全注意事项

### 1. 数据库访问控制

直接操作 Metabase 数据库具有一定风险，建议：
- 使用独立的数据库连接池
- 使用只读写必要表的数据库账号
- 不要在 Metabase 数据库中存储敏感业务数据

### 2. 用户权限管理

通过 `permissions_group_membership` 表控制用户权限：
- 新创建的用户默认加入指定用户组
- 用户组的权限在 Metabase 中统一配置
- 建议为自动创建的用户设置较低权限

### 3. HTTPS 强制

生产环境中务必使用 HTTPS：
- 在 Cookie 中添加 `Secure` 标记
- 防止 session key 在传输中被窃取

### 4. 密码策略

自动创建的用户使用统一的默认密码：
- 建议设置复杂的默认密码
- 首次登录时提示用户修改密码
- 或者禁用密码登录，仅支持 SSO 登录

### 5. Session 清理

定期清理过期的 session 记录：

```sql
DELETE FROM core_session 
WHERE created_at < NOW() - INTERVAL '14 days';
```

可以设置定时任务自动清理。

## 故障排查

### 问题 1: Cookie 未生效

**症状**: 跳转到 Metabase 后仍需要登录

**排查步骤**:
1. 检查 Cookie Domain 是否正确（浏览器开发者工具 → Application → Cookies）
2. 确认 Domain 前有没有点号（`.yourdomain.com`）
3. 检查 SameSite 设置，跨域场景建议用 `Lax` 或 `None`

### 问题 2: 用户创建后无法使用

**症状**: 用户可以登录但无法创建查询

**解决方案**: 确保在创建用户时保存了 `password_salt` 字段

### 问题 3: Session 立即失效

**症状**: 登录后刷新页面就退出

**排查步骤**:
1. 检查 `key_hashed` 是否正确计算（SHA-512）
2. 确认 `created_at` 时间戳格式正确
3. 检查 Metabase 配置中的 session 有效期设置

### 问题 4: 跨域 Cookie 无法设置

**症状**: Chrome 浏览器中 Cookie 未生成

**解决方案**:
- Chrome 80+ 版本对 SameSite 有严格限制
- 设置 `SameSite=None; Secure`（需要 HTTPS）
- 或确保应用和 Metabase 在同一根域名下

## 版本兼容性

本方案在以下版本测试通过：
- Metabase: v0.40.x - v0.48.x
- Spring Boot: 2.3.x - 2.7.x
- PostgreSQL: 12.x - 15.x

不同版本的 Metabase 数据库结构可能略有差异，升级前请先在测试环境验证。

## 总结

本文介绍的方案通过直接操作 Metabase 数据库实现了自动登录功能，适合以下场景：
- 使用 Metabase 开源版，无法使用企业版 SSO 功能
- 需要将 Metabase 深度集成到现有系统中
- 希望统一用户身份认证体系

**优点**:
- 实现简单，无需修改 Metabase 源码
- 用户体验好，一键跳转无需重复登录
- 灵活性高，可以自定义用户创建和权限分配逻辑

**缺点**:
- 直接操作数据库，存在一定维护成本
- Metabase 版本升级时可能需要适配
- 安全性需要额外关注

对于生产环境，建议：
1. 充分测试后再上线
2. 做好数据库备份
3. 监控 session 创建和用户登录情况
4. 定期清理过期数据

## 参考资料

- [Metabase 官方文档](https://www.metabase.com/docs/)
- [Metabase GitHub 仓库](https://github.com/metabase/metabase)
- [Cookie SameSite 属性说明](https://developer.mozilla.org/en-US/docs/Web/HTTP/Headers/Set-Cookie/SameSite)
