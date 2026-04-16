---
layout: post
title: "Springboot shutdown 耗时太长的分析使用btrace"
date: 2020-05-28 11:05:47 +0800
author: gaoxingliang
description: "背景没怎么用过springboot,  但是还是咬牙上了. 在这篇使用springboottest和h2来构建数据库测试的采坑记录中就发现我们的应用在测试用例跑完了无法自动关闭.  而且还总是等了2分钟就自动关闭了.  然后最开始以为是test case才有问题 结果发现是应用本身运行的时候正常关闭也有问题.如下图:(测试已经完了,springboot开始shutdown 但是进程本身没有退出)先google发现都是说的如何gracefully shutdown的… 并没有立即shutdown的…"
categories:
  - 迁移自CSDN
tags:
  - "springboot"
  - "btrace"
csdn_url: "https://blog.csdn.net/scugxl/article/details/106398890"
---

## 背景

**从本文你可以学到如何分析jvm无法正常关闭的问题? 知道why and how.**

没怎么用过springboot, 但是还是咬牙上了. 在这篇[使用springboottest和h2来构建数据库测试的采坑记录](https://blog.csdn.net/scugxl/article/details/106365282)中就发现我们的**应用在测试用例跑完了无法自动关闭.** 而且还总是等了2分钟就自动关闭了. 然后最开始以为是test case才有问题 结果发现是应用本身运行的时候正常关闭也有问题.  
 如下图:(测试已经完了,springboot开始shutdown 但是进程本身没有退出)  
 ![在这里插入图片描述]({{ '/assets/images/posts/springboot-shutdown-btrace-106398890/img-001.png' | relative_url }})

## 先google

发现都是说的如何gracefully shutdown的… 并没有立即shutdown的… 开始以为是springboot的问题, 写了个简单demo发现可以正常快速关闭…

## 初步诊断

一个简单办法是后台应用额外启动一个线程, 不断打印线程堆栈, 看看有哪些非daemon的线程,

```
        Thread th = new Thread(new Runnable() {
            @Override
            public void run() {
                while(true) {
                    try {
                        Thread.sleep(1000 * 5);
                    }
                    catch (InterruptedException e) {
                        e.printStackTrace();
                    }

                    Thread.getAllStackTraces().forEach((th, els) -> {
                        System.out.println("-----------------");

                        if (!th.isDaemon()) {
                            System.out.println("non daemon:" + th);
                            for (StackTraceElement e : els) {
                                System.out.println("\t\t" + e);
                            }
                        } else {
                            System.out.println("Daemon thread:" + th);
                        }

                        System.out.println("-----------------");
                    });

                }
            }
        });
        th.setName("PrintThread");
        th.setDaemon(true);
        th.start();
```

我发现了这个:

```
Daemon thread:Thread[pool-8-thread-1,5,main]
-----------------
-----------------
non daemon:Thread[nioEventLoopGroup-2-4,10,main]
		sun.nio.ch.KQueueArrayWrapper.kevent0(Native Method)
		sun.nio.ch.KQueueArrayWrapper.poll(KQueueArrayWrapper.java:198)
		sun.nio.ch.KQueueSelectorImpl.doSelect(KQueueSelectorImpl.java:117)
		sun.nio.ch.SelectorImpl.lockAndDoSelect(SelectorImpl.java:86)
		sun.nio.ch.SelectorImpl.select(SelectorImpl.java:97)
		io.netty.channel.nio.SelectedSelectionKeySetSelector.select(SelectedSelectionKeySetSelector.java:62)
		io.netty.channel.nio.NioEventLoop.select(NioEventLoop.java:753)
		io.netty.channel.nio.NioEventLoop.run(NioEventLoop.java:408)
		io.netty.util.concurrent.SingleThreadEventExecutor$5.run(SingleThreadEventExecutor.java:897)
		io.netty.util.concurrent.FastThreadLocalRunnable.run(FastThreadLocalRunnable.java:30)
		java.lang.Thread.run(Thread.java:748)
-----------------
-----------------
Daemon thread:Thread[Attach Listener,9,system]
-----------------
-----------------
Daemon thread:Thread[BTrace Command Queue Processor,5,main]
-----------------
-----------------
Daemon thread:Thread[RMI TCP Accept-0,5,system]
-----------------
-----------------
Daemon thread:Thread[Abandoned connection cleanup thread,5,main]
-----------------
-----------------
non daemon:Thread[pool-3-thread-1,5,main]
		sun.misc.Unsafe.park(Native Method)
		java.util.concurrent.locks.LockSupport.parkNanos(LockSupport.java:215)
		java.util.concurrent.locks.AbstractQueuedSynchronizer$ConditionObject.awaitNanos(AbstractQueuedSynchronizer.java:2078)
		java.util.concurrent.ScheduledThreadPoolExecutor$DelayedWorkQueue.take(ScheduledThreadPoolExecutor.java:1093)
		java.util.concurrent.ScheduledThreadPoolExecutor$DelayedWorkQueue.take(ScheduledThreadPoolExecutor.java:809)
		java.util.concurrent.ThreadPoolExecutor.getTask(ThreadPoolExecutor.java:1074)
		java.util.concurrent.ThreadPoolExecutor.runWorker(ThreadPoolExecutor.java:1134)
		java.util.concurrent.ThreadPoolExecutor$Worker.run(ThreadPoolExecutor.java:624)
		java.lang.Thread.run(Thread.java:748)
-----------------
-----------------
Daemon thread:Thread[RMI TCP Connection(3)-127.0.0.1,5,RMI Runtime]
-----------------
-----------------
Daemon thread:Thread[PrintThread,5,main]
-----------------
-----------------
non daemon:Thread[pool-6-thread-1,5,main]
		sun.misc.Unsafe.park(Native Method)
		java.util.concurrent.locks.LockSupport.parkNanos(LockSupport.java:215)
		java.util.concurrent.locks.AbstractQueuedSynchronizer$ConditionObject.awaitNanos(AbstractQueuedSynchronizer.java:2078)
		java.util.concurrent.ScheduledThreadPoolExecutor$DelayedWorkQueue.take(ScheduledThreadPoolExecutor.java:1093)
		java.util.concurrent.ScheduledThreadPoolExecutor$DelayedWorkQueue.take(ScheduledThreadPoolExecutor.java:809)
		java.util.concurrent.ThreadPoolExecutor.getTask(ThreadPoolExecutor.java:1074)
		java.util.concurrent.ThreadPoolExecutor.runWorker(ThreadPoolExecutor.java:1134)
		java.util.concurrent.ThreadPoolExecutor$Worker.run(ThreadPoolExecutor.java:624)
		java.lang.Thread.run(Thread.java:748)
-----------------
-----------------
Daemon thread:Thread[Monitor Ctrl-Break,5,main]
-----------------
-----------------
non daemon:Thread[nioEventLoopGroup-2-3,10,main]
		sun.nio.ch.KQueueArrayWrapper.kevent0(Native Method)
		sun.nio.ch.KQueueArrayWrapper.poll(KQueueArrayWrapper.java:198)
		sun.nio.ch.KQueueSelectorImpl.doSelect(KQueueSelectorImpl.java:117)
		sun.nio.ch.SelectorImpl.lockAndDoSelect(SelectorImpl.java:86)
		sun.nio.ch.SelectorImpl.select(SelectorImpl.java:97)
		io.netty.channel.nio.SelectedSelectionKeySetSelector.select(SelectedSelectionKeySetSelector.java:62)
		io.netty.channel.nio.NioEventLoop.select(NioEventLoop.java:753)
		io.netty.channel.nio.NioEventLoop.run(NioEventLoop.java:408)
		io.netty.util.concurrent.SingleThreadEventExecutor$5.run(SingleThreadEventExecutor.java:897)
		io.netty.util.concurrent.FastThreadLocalRunnable.run(FastThreadLocalRunnable.java:30)
		java.lang.Thread.run(Thread.java:748)
-----------------
-----------------
non daemon:Thread[nioEventLoopGroup-2-5,10,main]
		sun.nio.ch.KQueueArrayWrapper.kevent0(Native Method)
		sun.nio.ch.KQueueArrayWrapper.poll(KQueueArrayWrapper.java:198)
		sun.nio.ch.KQueueSelectorImpl.doSelect(KQueueSelectorImpl.java:117)
		sun.nio.ch.SelectorImpl.lockAndDoSelect(SelectorImpl.java:86)
		sun.nio.ch.SelectorImpl.select(SelectorImpl.java:97)
		io.netty.channel.nio.SelectedSelectionKeySetSelector.select(SelectedSelectionKeySetSelector.java:62)
		io.netty.channel.nio.NioEventLoop.select(NioEventLoop.java:753)
		io.netty.channel.nio.NioEventLoop.run(NioEventLoop.java:408)
		io.netty.util.concurrent.SingleThreadEventExecutor$5.run(SingleThreadEventExecutor.java:897)
		io.netty.util.concurrent.FastThreadLocalRunnable.run(FastThreadLocalRunnable.java:30)
		java.lang.Thread.run(Thread.java:748)
-----------------
-----------------
Daemon thread:Thread[COThread-kb,5,main]
```

有很多netty的线程没有关闭. 那么问题来了 : *如何知道是谁创建的这些线程呢? 在一个复杂项目中*

## 大杀器 BTrace

我的另外一篇博客: [记录一次TCP连接异常问题-使用btrace](https://blog.csdn.net/scugxl/article/details/81081262)  
 完整的代码参考github的md: [btrace\_usage.md](https://github.com/gaoxingliang/goodutils/blob/master/btrace/btrace_usage.md) 里面的0.1 Add an example of how to run 部分.  
 以前也有用过btrace, 发现btrace从 com.sun开源出来了… 给oracle点赞… 所以才有了更新后的文档.

## 回归正题

![在这里插入图片描述]({{ '/assets/images/posts/springboot-shutdown-btrace-106398890/img-002.png' | relative_url }})可以看到是我们引用的一个外部组件初始化的netty. 想办法加入springboot shutdownhook中就可以了. ps结果还发现了项目中其他多个地方非daemon线程. 统一修改后就可以了. 比如用guava的`ThreadFactoryBuilder`修饰一下就可以了

```
Executors.newSingleThreadScheduledExecutor(new ThreadFactoryBuilder().setDaemon(true).setNameFormat("cleanup-expirecode").build()).scheduleAtFixedRate(()
```

## 思考问题

1. 前面我有说到, 在自己的应用启动了一个额外的进程来打印堆栈, 实际上这个可以通过btrace实现.就留给大家思考啦.
2. springboot的DelayedShutdownHook 解决完自身的非daemon后发现还剩一个这个:

```
non daemon:Thread[DelayedShutdownHook-for-java.util.concurrent.ThreadPoolExecutor@2c47a053[Running, pool size = 0, active threads = 0, queued tasks = 0, completed tasks = 0],5,main]
		sun.misc.Unsafe.park(Native Method)
		java.util.concurrent.locks.LockSupport.parkNanos(LockSupport.java:215)
		java.util.concurrent.locks.AbstractQueuedSynchronizer$ConditionObject.awaitNanos(AbstractQueuedSynchronizer.java:2078)
		java.util.concurrent.ThreadPoolExecutor.awaitTermination(ThreadPoolExecutor.java:1475)
		com.google.common.util.concurrent.MoreExecutors$Application$1.run(MoreExecutors.java:203)
		java.lang.Thread.run(Thread.java:748)
```

如何通过btrace找到这个线程池是谁创建的呢? (ps: 跟前面监控线程创建类似类似)  
 结果发现是guava的线程池封装:

```
我们的代码:
    // private final ExecutorService _executor = Executors.newSingleThreadExecutor();
    private final ExecutorService _executor = MoreExecutors.getExitingExecutorService((ThreadPoolExecutor)
            Executors.newFixedThreadPool(1));
```

```
guava的代码:
com.google.common.util.concurrent.MoreExecutors.Application#getExitingExecutorService(java.util.concurrent.ThreadPoolExecutor)
    final ExecutorService getExitingExecutorService(ThreadPoolExecutor executor) {
      return getExitingExecutorService(executor, 120, TimeUnit.SECONDS);
    }
```

是的没错, 就是2分钟!!! 问题到此解决了.
