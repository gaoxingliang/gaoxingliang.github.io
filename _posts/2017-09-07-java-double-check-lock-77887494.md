---
layout: post
title: "关于java中的double check lock"
date: 2017-09-07 21:55:17 +0800
author: gaoxingliang
description: "实现一个正确的单例模式在熟悉的单例模式中你或许会遇到下面的方式来实现一个单例:// version 1class Singleton {    private static Singleton _INSTANCE    static Singleton getInstance() {        if (_INSTANCE == null) {            _INSTANCE"
categories:
  - 迁移自CSDN
tags:
  - "java"
  - "singleton"
  - "多线程"
csdn_url: "https://blog.csdn.net/scugxl/article/details/77887494"
---

##实现一个正确的单例模式

在熟悉的单例模式中你或许会遇到下面的方式来实现一个单例:

```
// version 1
class Singleton {
    private static Singleton _INSTANCE

    static Singleton getInstance() {
        if (_INSTANCE == null) {
            _INSTANCE = new Singleton()
        }
        return _INSTANCE;
    }

}
```

但是这个在多线程环境下会有问题:  
 **Problem 1: 这个会创建多个Singleton对象.**

那么我可以加上下面的同步就可以了:

```
// version 2
class Singleton {
    private static Singleton _INSTANCE

    static synchronized Singleton getInstance() {
        if (_INSTANCE == null) {
            _INSTANCE = new Singleton()
        }
        return _INSTANCE;
    }

}
```

**这是一个完全正确的版本, 除了性能比较差.**  
   
  
 那么我们可以直接不使用lazy init, 就可以不需要同步了:

```
// version 3
class Singleton {
    private static final Singleton _INSTANCE = new Singleton()
    static Singleton getInstance() {
        return _INSTANCE;
    }
}
```

**这里final不是必须的.**  
 static为我们提供了保证(正确的被创建, 创建的对象是完整的) 可以参考:[JSR 133 (Java Memory Model) FAQ](https://www.cs.umd.edu/~pugh/java/memoryModel/jsr-133-faq.html)

恩 这很不错, 除了 也许我根本不需要它, 但是有可能我们需要用到的时候才创建.

所以, 便引出我们今天的双重检查版本:

```
// version 4
class Singleton {
    private static Singleton _INSTANCE

    static Singleton getInstance() {
        if (_INSTANCE == null) {
            synchronized (Singleton.class) {
                if (_INSTANCE) {
                    _INSTANCE = new Singleton()
                }
            }
        }
        return _INSTANCE;
    }

}
```

这个代码是无法工作的. 因为这个可能让其他线程看到没有完全构件好的对象:

```
// 原始代码
_INSTANCE = new Singleton()

// 实际上的步骤:
1.allocateMemory -> object 
2.Singleton._INSTANCE = object
3.init object attributes
```

实际上我们对2,3 的步骤是无法保证,  
 也就是如果2先执行 (指令重排), 那么其他线程可能看到构建了一半的对象.

所以常见的可以在多线程下正确工作的单例模式:

1. static init
2. object holder
3. synchronized 在class上同步
4. 把instance标记为volatile. 因为volatile会禁止上面的重排(>=JDK1.4).

```
//object holder 
private static class LazySomethingHolder {
  public static Something something = new Something();
}

public static Something getInstance() {
  return LazySomethingHolder.something;
}
```

Reference:  
 1.<https://www.cs.umd.edu/~pugh/java/memoryModel/DoubleCheckedLocking.html>  
 2.<https://www.ibm.com/developerworks/java/library/j-dcl/index.html>
