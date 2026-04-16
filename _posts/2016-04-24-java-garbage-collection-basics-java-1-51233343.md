---
layout: post
title: "[翻译]Java Garbage Collection Basics Java 垃圾回收基础 之1 概览"
date: 2016-04-24 13:55:12 +0800
author: gaoxingliang
description: "概览目标本基础教程覆盖HotSpot JVM如何实现GC.主要包括如下内容: (1)了解GC如何工作的. (2)使用VisualVM监控GC过程. (3)了解Java SE 7 Hotspot JVM中的GC 收集器.预估完成时间1小时.简介这个OBE(译注:SRY,不知道啥意思,应该是一个组织的意思???),覆盖Java 中Java虚拟机(JVM) 垃圾回收(Garbage Collecto"
categories:
  - 迁移自CSDN
tags:
  - "java"
  - "jvm"
  - "虚拟机"
csdn_url: "https://blog.csdn.net/scugxl/article/details/51233343"
---

### 概览

#### 目标

本基础教程覆盖HotSpot JVM如何实现GC.主要包括如下内容:   
 (1)了解GC如何工作的.   
 (2)使用VisualVM监控GC过程.   
 (3)了解Java SE 7 Hotspot JVM中的GC 收集器.

#### 预估完成时间

1小时.

#### 简介

这个OBE(译注:SRY,不知道啥意思,应该是一个组织的意思???),覆盖Java 中Java虚拟机(JVM) 垃圾回收(Garbage Collector,GC)的相关主题.第一部分是关于GC和性能的介绍.接着会一步步指导JVM中GC是如何工作的.然后提供JDK中的一些监控工具来了解现实中GC.最后提供了关于Hotspot JVM中可用的GC 方案相关的选项.

#### 硬件和软件要求

PC + JDK update7 (>=) + Java 7 demos and samples zip.

#### 先决条件

[1]需要下载JDK 7 或者更新.[jdk 下载地址](http://www.oracle.com/technetwork/java/javase/downloads/index.html)   
 [2]下载并安装测试程序,并解压到指定路径.比如c:\javademos.   
 [Demos & samples 下载地址](http://www.oracle.com/technetwork/java/javase/downloads/jdk8-downloads-2133151.html)
