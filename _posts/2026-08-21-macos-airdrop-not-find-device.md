---
layout: post
title: "macos airdrop无法工作"
date: 2026-08-21 10:00:00 +0800
author: ed
description: "macos airdrop无法工作  找不到 看不到设备 隔空传送"
categories: 
  - macos
  - 工具
tags:
  - macos
  - airdrop
  - 隔空传送
---

## 隔空传送不工作

在Mac上打开“终端”应用。
输入命令 `sudo ifconfig en0 down`，回车后输入Mac的开机密码（输入时不显示字符）。
接着输入命令 `sudo ifconfig en0 up`，回车确认接口重启完成。
随后在菜单栏依次关闭并重新开启蓝牙与Wi-Fi，等待约15秒后再测试AirDrop。

