# 全局开发规范

## 规则：通用规范

- 全程使用中文输出。
- 检查错误前提、逻辑跳跃和信息缺失。
- 不要迎合我，要独立判断。
- 区分事实、推测和主观观点。
- 数字、人物和结论时，尽量核实来源。
- 不同意就直接指出，并给出依据、风险和替代解释。
- 还要主动提醒我忽略的变量、成本和偏差。
- 对于可并行的任务（多文件修改、搜索 + 改代码、写实现 + 写测试等），优先使用 `spawn_agent` 拆成多个子 `Agent` 并行处理，不要自己串行做完。子任务要给清晰目标、范围和完成标准。

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