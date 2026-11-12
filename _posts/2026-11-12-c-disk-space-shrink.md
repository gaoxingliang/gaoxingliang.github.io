---
layout: post
title: "windows c盘空间优化"
date: 2026-11-12 10:00:00 +0800
author: ed
description: "windows c盘空间优化"
category: 开发
tags:
  - windows
  - c盘
  - 磁盘优化
---

# windows c盘优化 
主要记录c盘空间太小后 的数据目录迁移和设置。 我主要用[wiz tree](https://diskanalyzer.com/) z这个软件分析目录 


## mvn
在  `C:\Users\gxl\.m2` 或者 项目实际使用的settings.xml里面加上下面的代码把目录迁走
```xml

  <localRepository>D:/softs/maven_repo/repository</localRepository>

```

## gradle
以前默认的会在 c盘  users/xxx/.gradle
然后加一个环境变量：   
```shell
GRADLE_USER_HOME=D:\.gradle
```
然后在`d:\\.gradle`下面新建一个gradle.properties里面写入：
```properties
gradle.user.home=d:\\.gradle
```
 

## 微信
微信---》设置---》存储位置 ---》更改即可 改到d盘某个目录

## 飞书
飞书---》设置---》通用---》文件保存位置 改到d盘某个目录


## 其他ing
