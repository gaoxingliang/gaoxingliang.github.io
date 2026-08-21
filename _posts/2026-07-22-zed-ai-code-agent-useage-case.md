---
layout: post
title: "zed ai编辑器使用记录"
date: 2026-07-22 10:00:00 +0800
author: ed
description: "ed ai编辑器使用记录"
categories: 
  - ai
  - zed
tags:
  - ai
  - zed
  - 代码编辑器
---

## 背景

从cursor切换到zed的一些配置技巧

---

## 快捷键
### file finder
Open key map settings--> 找到 file finder, 改为alt shift + R
### 关掉2个shift就弹窗
Open key map settings--> edit in json -->add below:

```json

  {
    "context": "Editor",
    "bindings": {
      "shift shift": null
    },
  },
```

## ai llm proxy

open settings --> AI ---> llm providers --> add provider  --> add open ai compatiable


## codegraph
安装：https://github.com/colbymchenry/codegraph
```shell
npm install -g @colbymchenry/codegraph
cd to your project
codegraph init
```
配置mcp： for zed:
```shell
"context_servers": {
    "Codegraph": {
      "enabled": true,
      "remote": false,
      "command": "codegraph",
      "args": ["serve", "--mcp"]
    }
}
```

## rtk

![]({{ '/assets/images/posts/2026-07-22-zed-ai-code-agent-useage-case/img.png' | relative_url }})


[点击阅读文档]({% link docs/rtk.md %})

## skills for UI
### web-design-guidelines  ---用于查看和review ui相关规范
```shell
npx skills add vercel-labs/agent-skills --skill web-design-guidelines -g -y

```


### ui-ux-pro-max   用于前端页面与组件的设计、配色、排版、交互和可视化方案

```shell
npm install -g ui-ux-pro-max-cli
uipro init --ai all
```


