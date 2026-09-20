---
title: 这个是rtk的agents文档
---

{% raw %}
# 全局开发规范

## RTK

**用途**：针对 `Shell` 命令的 `Token` 优化代理。

### 规则

所有 `Shell` 命令必须以 `rtk` 作为前缀。

示例：

```bash
rtk git status
rtk cargo test
rtk npm run build
rtk pytest -q
```

### 元命令

```bash
rtk gain            # Token 节省分析
rtk gain --history  # 最近的命令节省历史
rtk proxy <cmd>     # 不做过滤地运行原始命令
```

### 验证

```bash
rtk --version
rtk gain
which rtk
```

{% endraw %}