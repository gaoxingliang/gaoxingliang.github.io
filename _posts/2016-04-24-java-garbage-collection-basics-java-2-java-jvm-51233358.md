---
layout: post
title: "[翻译]Java Garbage Collection Basics Java 垃圾回收基础 之2 Java 技术与JVM"
date: 2016-04-24 13:59:55 +0800
author: gaoxingliang
description: "Java 技术与JVMJAVA概述JAVA是Sun公司在1995年发布的一个编程语言和计算平台.并在工具/游戏/商业应用上大放异彩.Java在超过850 * 百万 的个人电脑, 在10亿级的设备上运行(包括了移动设备和TV).java有一系列关键组件组成,最终构建了Java平台.Java运行时版本当你下载java后,你得到了一个Java运行时环境(Java Runtime Environment,J"
categories:
  - 迁移自CSDN
tags:
  - "java"
  - "jvm"
  - "gc"
  - "垃圾回收"
csdn_url: "https://blog.csdn.net/scugxl/article/details/51233358"
---

### Java 技术与JVM

#### JAVA概述

JAVA是Sun公司在1995年发布的一个编程语言和计算平台.并在工具/游戏/商业应用上大放异彩.Java在超过850 \* 百万 的个人电脑, 在10亿级的设备上运行(包括了移动设备和TV).java有一系列关键组件组成,最终构建了Java平台.

##### Java运行时版本

当你下载java后,你得到了一个Java运行时环境(Java Runtime Environment,JRE).JRE包括了Java虚拟机, Java 平台核心类,. 一些支撑Java平台的类库.拥有这3样东西后,你就可以在电脑上运行Java程序啦.(后面的忽略了一点点关于Java FX ,JAVA WEBSTART 相关的内容.此处省略30字.)

##### Java编程语言

Java是一个面向对象的语言,包括如下特性:

1. 平台无关性.-Java应用是通过Jvm来运行编译后存储在class文件中的字节码实现的.既然他们运行在JVM之上,那么它可以运行在各种各样的操作系统和设备上.
2. 面向对象-Java是一个面向对象的语言,并且吸收了很多C/C++的特性,同时也做了提升.
3. 自动垃圾回收-Java自动分配和释放内存,这样程序不需要关注这个任务.
4. 丰富的标准库-Java包含了大量的预设的对象,用于完成输入/输出, 网络通信,时间操作等.

##### Java开发套件 JDK

Java开发套件(Java Development Kit ,JDK )是一套用于开发Java应用的工具集.通过JDK你可以编译Java程序,并且在JVM中运行他们.除此之外JDK也提供了一些用于打包和发布你的应用的工具.   
 JDK和JRE公用一套JAVA 应用编程接口(Application Programming Interfaces, [API](http://docs.oracle.com/javase/7/docs/api/)).API是一个用于创建JAVA程序的打包好的类库集合.JAVA API 通过提供基础的工具类,包括:字符串操作,时间/日期处理,网络通信,数据结构来降低JAVA开发的难度,让编写JAVA应用更加容易.

##### JAVA 虚拟机

JAVA 虚拟机(JVM)是一个抽象的计算机器.JVM看起来像一个用户的程序的执行容器.因为Java程序是通过同一套接口和类库编写的,但不同操作系统的JVM实现了将java语言指令翻译成在特定的操作系统上运行的指令/命令,通过这样的方式,JAVA实现了平台无关性.   
 JVM的的一个原型是SUN公司实现的,在一台PDA上运行,模仿了JVM的指令集.Oracle的当前实现了在移动设备,桌面设备和服务器设备.但JVM并不假定或者约束特定的平台实现,主机硬件,或者操作系统.只要能编译程序并且在CPU上得以运行.   
 JVM并不知道JAVA语言的任何东西,除了特定的二进制CLASS文件的格式.一个CLASS文件包括了JVM指令集(字节码)和一个符号表和其他的辅助信息.

因为安全的考虑,JVM强制约束了class文件中的语法和结构.无论如何,任何语言通过一个合法的CLASS文件都可以被JVM运行.通过这个神奇的特性(通用的,平台无关的,)其他的语言的语言可以将JVM编程一个方便的交通工具(运行时.)[JVM规范.](http://docs.oracle.com/javase/specs/jvms/se7/html/jvms-1.html)

#### 漫游JVM架构

##### Hotspot JVM架构

HotSpot JVM具有一个良好的架构,具有很多有用的特性和功能,并且具有实现高性能和巨大的可扩展性的能力.举例来说:HotSpot JIT编译器可以实现动态的优化,换言之,在JAVA程序运行过程中,它会根据底层平台做相关的性能优化,并生成高性能的本地机器指令,除此之外,通过持续的演变和工程化它的运行时系统和多线程垃圾回收器,HotSpot JVM收到了高可扩展性,在巨大的计算系统上也是如此.

![jvm arch]({{ '/assets/images/posts/java-garbage-collection-basics-java-2-java-jvm-51233358/img-001.png' | relative_url }})   
 JVM的主要组成部分包括:类加载器,运行时数据区和执行引擎.

#### Hotspot关键组件

下图中高亮的是hotspot与性能息息相关的关键组件:   
 ![key-comp]({{ '/assets/images/posts/java-garbage-collection-basics-java-2-java-jvm-51233358/img-002.png' | relative_url }})

在性能优化过程中有3个重要的组件:   
 1.堆-你数据存储的地方,该区域随后由启动时选择的GC管理.大多数的性能优化选项是关于堆大小调节,以及选择最合适的GC.   
 2.GC前面1说到了.   
 3.JIT编译器对性能也有相当大的影响,但在较新的JVM上,一般不需要对其进行优化.

#### 性能基础

一般的,在对一个java应用做性能优化时,一般关注以下2个目标中的一个:响应性或者吞吐量.我们会在教程过程中引用这些概念.

##### 响应性

响应性描述应用针对一个请求数据多久能够响应

- 一个桌面UI响应一个事件/操作有多快?
- 一个网站多久返回页面
- 一个数据库查询多快返回

对于关注响应性的一样而言,长的暂停时间是不可接受的.它关注的是在很短时间内响应.

##### 吞吐量

吞吐量关注于在一段时间内最大化工作个数.关注吞吐量的例子或者衡量吞吐量的方法

- 给定时间内,事务完成的数量
- 在1小时内,一个批处理程序能够完成的工作数
- 在1小时内 数据能够完成的查询数量.
