---
layout: post
title: "[翻译]Java Garbage Collection Basics Java 垃圾回收基础 之4 分代的垃圾回收过程"
date: 2016-04-24 14:52:14 +0800
author: gaoxingliang
description: "分代的垃圾回收过程现在我们知道了为什么堆被分为不同代,那么用一点时间来看看这些不同代之间是如何交付的.下面的这些图片描述了在JVM中.对象的分配和变老的过程. 1.任何新创建的对象都在eden区分配,2个survivor都是空的. 2.当eden区满了,会触发一次minor gc 3.此时还被引用的对象会移到第一个Survivor区S0.清除Eden区时,未被引用的对象被删除 4.在下次mi"
categories:
  - 迁移自CSDN
tags:
  - "java"
  - "对象"
  - "gc"
csdn_url: "https://blog.csdn.net/scugxl/article/details/51233617"
---

### 分代的垃圾回收过程

现在我们知道了为什么堆被分为不同代,那么用一点时间来看看这些不同代之间是如何交付的.下面的这些图片描述了在JVM中.对象的分配和变老的过程.   
**1.**任何新创建的对象都在eden区分配,2个survivor都是空的.   
![这里写图片描述]({{ '/assets/images/posts/java-garbage-collection-basics-java-4-51233617/img-001.png' | relative_url }})

**2.**当eden区满了,会触发一次minor gc   
![这里写图片描述]({{ '/assets/images/posts/java-garbage-collection-basics-java-4-51233617/img-002.png' | relative_url }})

**3.**此时还被引用的对象会移到第一个Survivor区S0.清除Eden区时,未被引用的对象被删除   
![这里写图片描述]({{ '/assets/images/posts/java-garbage-collection-basics-java-4-51233617/img-003.png' | relative_url }})

**4.**在下次minor gc时,在eden区发生同样的事情.未被引用的对象被清除,被引用的对象被移到survivor区.不同的是,在这种情况下,它们被移入第2个survivor区 S1.除此之外,上次MINOR GC在 S0中存活的对象,变老了,并被移入到S1.当所有存活的对象都被移入到S1后,S0和eden区被清空了.注意观察下图中不同动向如何变老的.   
![这里写图片描述]({{ '/assets/images/posts/java-garbage-collection-basics-java-4-51233617/img-004.png' | relative_url }})

**5.**下次minor gc,同样重复上面的过程.但是survivor区被调换了.被引用的对象被移入到S0, 存活对象变老了.eden区和S1被清空了.   
![这里写图片描述]({{ '/assets/images/posts/java-garbage-collection-basics-java-4-51233617/img-005.png' | relative_url }})   
**6.**下图展示了”提升/晋升”过程.在一次minor gc执行完后,年老的对象达到了特定的年龄阈值(比如8),这些对象从年轻代晋升到年老代.(译注:可以通过JVM参数:-XX:MaxTenuringThreshold=8 设置.)   
![这里写图片描述]({{ '/assets/images/posts/java-garbage-collection-basics-java-4-51233617/img-006.png' | relative_url }})

**7.**随着更多的minor gc,更多的对象会晋升到年老代.   
![这里写图片描述]({{ '/assets/images/posts/java-garbage-collection-basics-java-4-51233617/img-007.png' | relative_url }})

**8.**接着更多的对象从年轻代晋升到老年代.最终触发一次major gc用于清除和压缩年老代.

![这里写图片描述]({{ '/assets/images/posts/java-garbage-collection-basics-java-4-51233617/img-008.png' | relative_url }})
