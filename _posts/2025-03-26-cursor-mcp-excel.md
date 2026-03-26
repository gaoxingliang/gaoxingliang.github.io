---
layout: post
title: "Cursor中的excel & word mcp使用和配置"
date: 2025-03-26 10:00:00 +0800
author: ed
description: "在cursor中使用excel 和 excel mcp来方便word excel的理解和读取。"
category: 开发
tags:
  - MCP
  - Cursor
---

## excel mcp
### 安装excel-mcp
```sh
pip install excel-mcp
```

### 配置
在.cursor/mcp.json中配置：
```json
{
    "mcpServers": {
  
      "excel-mcp": {
        "command": "python", 
        "args": ["-m", "excel_mcp", "stdio"],
        "env": {
          "EXCEL_FILES_PATH": "D:\\code\\xxx\\quanfeng-end\\analysis\\"
        },
        "transport": "stdio"
      }
    }
  }
  
```
通过环境变量`EXCEL_FILES_PATH`配置对应的excel文件路径

## word mcp
### 安装uv
从这里下载： [uv windows](https://release-assets.githubusercontent.com/github-production-release-asset/699532645/3da0a768-dcf3-45aa-8334-5736f9fa84e5?sp=r&sv=2018-11-09&sr=b&spr=https&se=2026-03-26T08%3A49%3A40Z&rscd=attachment%3B+filename%3Duv-x86_64-pc-windows-msvc.zip&rsct=application%2Foctet-stream&skoid=96c2d410-5711-43a1-aedd-ab1947aa7ab0&sktid=398a6654-997b-47e9-b12b-9515b896b4de&skt=2026-03-26T07%3A49%3A39Z&ske=2026-03-26T08%3A49%3A40Z&sks=b&skv=2018-11-09&sig=JoRDh8cZ6NzNLuZ7PPjRnhUrYgAD9K4jl0GnCyWf45E%3D&jwt=eyJ0eXAiOiJKV1QiLCJhbGciOiJIUzI1NiJ9.eyJpc3MiOiJnaXRodWIuY29tIiwiYXVkIjoicmVsZWFzZS1hc3NldHMuZ2l0aHVidXNlcmNvbnRlbnQuY29tIiwia2V5Ijoia2V5MSIsImV4cCI6MTc3NDUxMzM1NCwibmJmIjoxNzc0NTExNTU0LCJwYXRoIjoicmVsZWFzZWFzc2V0cHJvZHVjdGlvbi5ibG9iLmNvcmUud2luZG93cy5uZXQifQ.a1Si4YHQ06byrL73-pBh_H_rWaoQnjJCTB3sazx9bCU&response-content-disposition=attachment%3B%20filename%3Duv-x86_64-pc-windows-msvc.zip&response-content-type=application%2Foctet-stream)
然后解压后配置环境变量：<br>
```shell
PATH里面加上：D:\softs\uv\
额外添加：
UV_DEFAULT_INDEX=https://pypi.tuna.tsinghua.edu.cn/simple
```
然后手动安装相关依赖：
```shell
D:\softs\uv\uvx.exe --from office-word-mcp-server word_mcp_server
```

### cursor 里面配置
```json
    "word-document-server": {
      "command": "D:\\softs\\uv\\uvx.exe",
      "args": ["--from", "office-word-mcp-server", "word_mcp_server"]
    }
```

## 参考链接
- [github excel mcp server](https://github.com/haris-musa/excel-mcp-server)
- [word mcp](https://github.com/GongRzhe/Office-Word-MCP-Server)