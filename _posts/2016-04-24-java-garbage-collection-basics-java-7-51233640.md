---
layout: post
title: "[翻译]Java Garbage Collection Basics Java 垃圾回收基础 之7 总结"
date: 2016-04-24 14:56:49 +0800
author: gaoxingliang
description: "总结在本文中，关于java jvm的垃圾回收系统有了一个大的了解。首先，你应该了解了为啥垃圾回收器和堆死Java JVM的关键部分。一旦你了解了这个过程，你可以通过Visual VM工具来观察。最后，你了解在HotSpot JVM中可用的垃圾回收器。 在这个初学者指南中，你学会了:Java VM 组成部分自动垃圾回收是如何工作的分代GC的过程如何使用VisualVm监控你的JVMJVM"
categories:
  - 迁移自CSDN
tags:
  - "java"
  - "jvm"
  - "gc"
csdn_url: "https://blog.csdn.net/scugxl/article/details/51233640"
---

### 总结

在本文中，关于java jvm的垃圾回收系统有了一个大的了解。首先，你应该了解了为啥垃圾回收器和堆死Java JVM的关键部分。一旦你了解了这个过程，你可以通过Visual VM工具来观察。最后，你了解在HotSpot JVM中可用的垃圾回收器。   
 在这个初学者指南中，你学会了:

- Java VM 组成部分
- 自动垃圾回收是如何工作的
- 分代GC的过程
- 如何使用VisualVm监控你的JVM
- JVM 可用的垃圾回收器

原文：   
 <http://www.oracle.com/webfolder/technetwork/tutorials/obe/java/gc01/index.html#overview>
