---
layout: post
title: "小而美的java webserver框架--Javalin"
date: 2021-08-11 14:08:43 +0800
author: gaoxingliang
description: "javalin 是一个非常简单易用的web框架, 官网https://javalin.io/ 对于想快速搭建一个简单地web请求通讯服务器非常方便, 这篇文章就来介绍下:build gradle在build.gradle中引入:    compile 'io.javalin:javalin:3.13.5'上手起来非常简单如下:import io.javalin.Javalin;public class HelloWorld {    public static void ."
categories:
  - 迁移自CSDN
tags:
  - "java"
  - "javalin"
  - "webserver"
csdn_url: "https://blog.csdn.net/scugxl/article/details/119605248"
---

javalin 是一个非常简单易用的web框架, 官网<https://javalin.io/>  对于想快速搭建一个简单地web请求通讯服务器非常方便, 这篇文章就来介绍下:

## build gradle

在build.gradle中引入:

```
    compile 'io.javalin:javalin:3.13.5'
```

上手起来非常简单如下:

```
import io.javalin.Javalin;

public class HelloWorld {
    public static void main(String[] args) {
        Javalin app = Javalin.create().start(7000);
        app.get("/", ctx -> ctx.result("Hello World"));
    }
}
```

## 常见的使用

GET 请求:

```
app.addHandler(HandlerType.GET, "/internal/stats", (ctx) -> {
                    ctx.result("okay");
            });
```

返回结果使用ctx.result()即可.

GET 请求获取path参数:

```
 app.addHandler(HandlerType.GET, "/api/additional/:type", (ctx) -> {
                String type = ctx.pathParam("type");
         ...

});
```

POST 请求 获取body:

```
        app.addHandler(HandlerType.POST, "/api/test", (ctx) -> {
            
            byte [] body = ctx.bodyAsBytes();
        });
```

## 使用中可能遇到的问题

当你在使用javalin时, 而且系统中已经包含jetty时, 可能出现如下错误:

```
ClassNotFound: WebSocketServletFactory
```

这个问题的解决办法([参考: url](https://github.com/tipsy/javalin/issues/358)):

```
        ClassLoader classLoader = Thread.currentThread().getContextClassLoader();
        Thread.currentThread().setContextClassLoader(WebSocketServerFactory.class.getClassLoader());
        app.start("127.0.0.1", myport);
        Thread.currentThread().setContextClassLoader(classLoader);
```
