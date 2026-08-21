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

### 统一设置
AirDrop的设备发现行为由“允许这些人发现我”策略严格控制。如果Mac设为“仅限联系人”而iPhone未保存在其通讯录中，就会导致手机搜不到Mac。<br>
Mac端：打开“访达（Finder）”，点击左侧边栏的“AirDrop”，滚动至窗口底部，找到“允许这些人发现我”选项，将其下拉菜单改为“所有人”。<br>
手机端：从屏幕右上角下滑调出控制中心，长按网络模块，点击AirDrop图标，同样将其设为“所有人”<br>

### 重启网络
在Mac上打开“终端”应用。<br>
输入命令 `sudo ifconfig en0 down`，回车后输入Mac的开机密码（输入时不显示字符）。<br>
接着输入命令 `sudo ifconfig en0 up`，回车确认接口重启完成。<br>
随后在菜单栏依次关闭并重新开启蓝牙与Wi-Fi，等待约15秒后再测试AirDrop。<br>

