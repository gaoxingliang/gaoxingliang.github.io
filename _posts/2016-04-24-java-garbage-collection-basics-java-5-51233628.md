---
layout: post
title: "[翻译]Java Garbage Collection Basics Java 垃圾回收基础 之5 自己动手观察"
date: 2016-04-24 14:54:46 +0800
author: gaoxingliang
description: "自己动手观察概览在本节观察GC过程是如何处理的.你会运行一个java应用并通过VisualVM 工具 分析GC过程. (译注:这里更多的图示是根据本地环境重新截图,更多是译者操作,使用jdk 为jdk 1.8.5 64 version)动手操作Step1 初始操作(1)安装jdk并确保java环境变量正确.  (2)下载前面的java demos and samples. 百度云下载Step2"
categories:
  - 迁移自CSDN
tags:
  - "java"
  - "gc"
csdn_url: "https://blog.csdn.net/scugxl/article/details/51233628"
---

### 自己动手观察

#### 概览

在本节观察GC过程是如何处理的.你会运行一个java应用并通过VisualVM 工具 分析GC过程.   
 (译注:这里更多的图示是根据本地环境重新截图,更多是译者操作,使用jdk 为jdk 1.8.5 64 version)

#### 动手操作

##### Step1 初始操作

(1)安装jdk并确保java环境变量正确.   
 (2)下载前面的java demos and samples. [百度云下载](http://pan.baidu.com/s/1jIjfJDk)

##### Step2 启动示例应用

假定java demos解压后放在:c:\javademos   
 打开cmd执行:   
 java -Xmx12m -Xms3m -Xmn1m -XX:PermSize=20m -XX:MaxPermSize=20m -XX:+UseSerialGC -jar C:\javademos\jdk-8u91-windows-x64-demos\jdk1.8.0\_91\demo\jfc\Java2D\Java2demo.jar   
 看到如下的应用:   
 ![这里写图片描述]({{ '/assets/images/posts/java-garbage-collection-basics-java-5-51233628/img-001.png' | relative_url }})

##### Step3 启动 VisualVM

在jdk安装路径下,双击jvisualvm.exe 即可.   
 C:\Program Files\Java\jdk1.8.0\_05\bin   
 ![这里写图片描述]({{ '/assets/images/posts/java-garbage-collection-basics-java-5-51233628/img-002.png' | relative_url }})

##### Step4 安装 visual gc 插件

visual gc 插件提供了可视化的gc 图表.   
 安装步骤:(1)在jvisualvm 的tools ->plugins里面。   
 ![这里写图片描述]({{ '/assets/images/posts/java-garbage-collection-basics-java-5-51233628/img-003.png' | relative_url }})

##### Step5 分析Java2Demo

点击左边所有可以监控的java进程后，切换到visual gc tab页查看。   
 ![这里写图片描述]({{ '/assets/images/posts/java-garbage-collection-basics-java-5-51233628/img-004.png' | relative_url }})
