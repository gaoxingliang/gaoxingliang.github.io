# 图片资源管理

## 目录结构

```
assets/images/
├── global/          # 全站共用（头像、Logo 等）
└── posts/           # 按文章分目录
    └── 2025-03-04-dbhub-docker-cursor-mcp/
        └── xxx.png
```

## 命名规范

- 使用小写、连字符：`docker-compose-diagram.png`
- 避免中文和空格
- 建议加日期前缀便于排序：`01-architecture.png`

## 在文章中引用

**方式一：相对路径（推荐）**

```markdown
![图片描述]({{ '/assets/images/posts/2025-03-04-dbhub-docker-cursor-mcp/xxx.png' | relative_url }})
```

**方式二：绝对路径**

```markdown
![图片描述](/assets/images/posts/2025-03-04-dbhub-docker-cursor-mcp/xxx.png)
```

> 使用 `relative_url` 可兼容 `baseurl` 子路径部署。

## 建议

- 单张图片 < 500KB，可用 [TinyPNG](https://tinypng.com/) 压缩
- 优先使用 WebP 格式减小体积
