---
layout: post
title: "Java中的BIO,NIO,AIO详解以及Echo实现示例"
date: 2019-02-01 16:03:33 +0800
author: gaoxingliang
description: "Abstract在本博客当中我们主要会分为如下几点:Java中的BIO NIO AIO是啥BIO NIO AIO实现的简单Echo client和serverNIO AIO 深入之内部实现NIO AIO的设计模式: Reactor 以及 Proactor本文所有的代码都可以在最后的github找到.IO 的分类BIOBIO 是 blocking io, 在jdk1.0的时候引..."
categories:
  - 迁移自CSDN
tags:
  - "io"
  - "nio"
  - "aio"
  - "echo"
  - "bio"
csdn_url: "https://blog.csdn.net/scugxl/article/details/86742171"
---

## Abstract

在本博客当中我们主要会分为如下几点:

- Java中的BIO NIO AIO是啥
- BIO NIO AIO实现的简单Echo client和server
- NIO AIO 深入之内部实现
- NIO AIO的设计模式: Reactor 以及 Proactor  
   本文所有的代码都可以在最后的github找到.

## IO 的分类

### BIO

BIO 是 blocking io, 在jdk1.0的时候引入的. 它更多的是表现为1对1的请求-线程的处理方式.  
 如下图:  
 ![thread per connection]({{ '/assets/images/posts/java-bio-nio-aio-echo-86742171/img-001.png' | relative_url }})  
 或者 为了提高线程的利用率而采用的线程池版本.  
 这样的架构有明显的缺点:  
 1.线程切换带来的开销  
 2.编程时需要考虑同步.  
 3.需要考虑线程池大小,队列大小,拒绝策略等等等等.

BIO echo server:

```
package io.bio;

import io.common.ServerInfo;

import java.io.BufferedWriter;
import java.io.IOException;
import java.io.OutputStreamWriter;
import java.net.ServerSocket;
import java.net.Socket;
import java.util.Scanner;
import java.util.concurrent.ExecutorService;
import java.util.concurrent.Executors;

/**
 * 最基础的BIO服务器端
 */
public class BioServer {
    public static void main(String[] args) throws Exception {

        ServerSocket ss = new ServerSocket(ServerInfo.PORT);
        System.out.println("Server started on " + ServerInfo.PORT);
        ExecutorService es = Executors.newCachedThreadPool();

        while (true) {
            Socket socket = ss.accept();
            es.submit(new TaskHandler(socket));
        }
    }

    static class TaskHandler implements Runnable {
        private Socket socket;
        private Scanner scanner;
        private BufferedWriter out;

        public TaskHandler(Socket socket) {
            this.socket = socket;
            try {
                scanner = new Scanner(socket.getInputStream());
                out = new BufferedWriter(new OutputStreamWriter(socket.getOutputStream()));
            }
            catch (IOException e) {
                e.printStackTrace();
            }
        }

        @Override
        public void run() {
            boolean flag = true;
            while (flag) {
                String line = scanner.nextLine();
                System.out.println("Read from client - " + line);
                if (line != null) {
                    String writeMessage = "[Echo] " + line + "\n";
                    if (line.equalsIgnoreCase("bye")) {
                        flag = false;
                        writeMessage = "[Exit] byebye " + "\n";
                    }
                    try {
                        out.write(writeMessage);
                        out.flush();
                    }
                    catch (IOException e) {
                        e.printStackTrace();
                    }
                }
            }

            scanner.close();
            try {
                out.close();
            }
            catch (IOException e) {
                e.printStackTrace();
            }
            try {
                socket.close();
            }
            catch (IOException e) {
                e.printStackTrace();
            }
        }
    }
}
```

BIO echo client:

```
package io.bio;

import io.common.InputUtil;
import io.common.ServerInfo;

import java.io.BufferedReader;
import java.io.InputStreamReader;
import java.net.InetAddress;
import java.net.Socket;
import java.util.Scanner;

/**
 * 最基础的BIO 客户端
 */
public class BioClient {
    public static void main(String[] args) throws Exception {
        Socket socket = new Socket(InetAddress.getByName(ServerInfo.HOST), ServerInfo.PORT);
        Scanner scanner = new Scanner(new BufferedReader(new InputStreamReader(socket.getInputStream())));
        scanner.useDelimiter("\n");
        while (true) {
            String line = InputUtil.getLine("Input something:").trim();
            socket.getOutputStream().write((line + "\n").getBytes());
            if (line.equalsIgnoreCase("bye")) {
                break;
            }
            System.out.println("Read resp from remote:" + scanner.nextLine());
        }
        socket.close();
    }
}
```

### NIO

同步非阻塞的IO, 在JDK 1.4的时候引入. 主要逻辑就是基于Selector模式来注册自己关注的事件, 然后当关注的事件发生时,进一步处理IO请求.  
 ![NIO]({{ '/assets/images/posts/java-bio-nio-aio-echo-86742171/img-002.png' | relative_url }})  
 NIO里面有2个很重要的组件就是Reactor和Handler  
 Reactor: 一个单线程的程序, 用于不断收集和分发关心的IO事件.  
 Handler:读取或者处理IO请求, 可以在Reactor的线程里面做,或者为了提高性能在单独的线程池里面做.  
 NIO Echo server:

```
package io.nio;

import io.common.ServerInfo;

import java.net.InetSocketAddress;
import java.nio.ByteBuffer;
import java.nio.channels.SelectionKey;
import java.nio.channels.Selector;
import java.nio.channels.ServerSocketChannel;
import java.nio.channels.SocketChannel;
import java.util.Iterator;
import java.util.Set;
import java.util.concurrent.ExecutorService;
import java.util.concurrent.Executors;

public class NioServer {

    private static class TaskHandler implements Runnable {
        private SocketChannel clientChannel;
        public TaskHandler(SocketChannel clientChannel) {
            this.clientChannel = clientChannel;
        }

        @Override
        public void run() {
            ByteBuffer buf = ByteBuffer.allocate(50);
            try {
                boolean flag = true;
                while (flag) {
                    buf.clear();
                    int read = clientChannel.read(buf);
                    String readMessage = new String(buf.array(), 0, read);
                    String writeMessage = "[Echo] " + readMessage + "\n";
                    if ("bye".equalsIgnoreCase(readMessage)) {
                        writeMessage = "[Exit] byebye" + "\n";
                        flag = true;
                    }

                    // 写返回数据
                    buf.clear();
                    buf.put(writeMessage.getBytes());
                    buf.flip(); // 重置缓冲区让其输出
                    clientChannel.write(buf);
                }
                clientChannel.close();

            }
            catch (Exception e) {
                e.printStackTrace();
            }
        }
    }

    public static void main(String[] args) throws Exception {
        ExecutorService es = Executors.newFixedThreadPool(10);

        Selector selector = Selector.open();
        ServerSocketChannel serverSocketChannel = ServerSocketChannel.open();
        serverSocketChannel.configureBlocking(false);
        serverSocketChannel.bind(new InetSocketAddress(ServerInfo.PORT));

        serverSocketChannel.register(selector, SelectionKey.OP_ACCEPT);
        System.out.println("服务启动在-" + ServerInfo.PORT);

        while (selector.select() > 0) {
            Set<SelectionKey> keys = selector.selectedKeys();
            Iterator<SelectionKey> keyIterator = keys.iterator();
            while (keyIterator.hasNext()) {
                SelectionKey key = keyIterator.next();
                if (key.isAcceptable()) {
                    SocketChannel socketChannel = serverSocketChannel.accept();
                    if (socketChannel != null) {
                        // 提交一个任务去处理
                        es.submit(new TaskHandler(socketChannel));
                    }
                }
            }
        }

    }
}
```

NIO Echo client

```
package io.nio;

import io.common.InputUtil;
import io.common.ServerInfo;

import java.net.InetSocketAddress;
import java.nio.ByteBuffer;
import java.nio.channels.SocketChannel;

public class NioClient {
    public static void main(String[] args) throws Exception {
        SocketChannel socketChannel = SocketChannel.open();
        socketChannel.connect(new InetSocketAddress(ServerInfo.HOST, ServerInfo.PORT));

        ByteBuffer buf = ByteBuffer.allocate(50);

        boolean flag = true;
        while (flag) {
            buf.clear();
            String input = InputUtil.getLine("Input something:");
            if (input.equalsIgnoreCase("bye")) {
                flag = false;
            }
            input += "\n";
            buf.put(input.getBytes());
            buf.flip();
            socketChannel.write(buf);
            buf.clear();
            int read = socketChannel.read(buf);
            String readMessage = new String(buf.array(), 0, read);
            System.out.println("Read resp - " + readMessage);
        }
        socketChannel.close();

    }
}
```

### AIO

AIO 异步非阻塞IO, 前面的NIO在读和写时实际上都是发生在当前的业务线程中. 而AIO不同, AIO是**在IO完成后,**通知你说,你可以接着做剩下的事了. 注意体会这里与NIO的不同之处. NIO是告诉你说 有东西可以读取了, 然后你**得自己去负责读取**.  
 这就是NIO和AIO的最大的区别.

#### AIO怎么实现的?

实际上AIO与NIO都是基于同一套IO框架实现的.  
 在Linux是EPOLL或者KQueue (kqueue在mac,bsd上有).  
 具体代码在:UnixAsynchronousSocketChannelImpl  
 以及不同的实现:  
 ![在这里插入图片描述]({{ '/assets/images/posts/java-bio-nio-aio-echo-86742171/img-003.png' | relative_url }})

在Windows上是基于Windows内核提供的[IOCP](https://en.wikipedia.org/wiki/Input/output_completion_port) 实现的(IOCP: windows 内核提供的一种异步IO操作 通过消息队列的方式来通知IO消息)  
 具体代码在: WindowsAsynchronousSocketChannelImpl  
 ![在这里插入图片描述]({{ '/assets/images/posts/java-bio-nio-aio-echo-86742171/img-004.png' | relative_url }})  
 当我们深入查看AIO的实现时,可以发现实际上AIO只是一种API层级的更新(内部有一个While true 循环)当有数据读取时,自动调用对应的Callback. 正是因为如此, 他们的性能并没有太大的差距.

AIO Echo Server:

```
package io.aio;

import io.common.ServerInfo;

import java.net.InetSocketAddress;
import java.nio.ByteBuffer;
import java.nio.channels.AsynchronousServerSocketChannel;
import java.nio.channels.AsynchronousSocketChannel;
import java.nio.channels.CompletionHandler;
import java.util.concurrent.CountDownLatch;

public class AioServer {
    public static void main(String[] args) throws Exception {
        AsynchronousServerSocketChannel serverSocketChannel = AsynchronousServerSocketChannel.open();
        serverSocketChannel.bind(new InetSocketAddress(ServerInfo.PORT));
        serverSocketChannel.accept(null, new AcceptFinishHandler());
        System.out.println("Server 启动了 - " + ServerInfo.PORT);
        CountDownLatch running = new CountDownLatch(1);
        running.await();
    }

    static class ReadFinishHandler implements CompletionHandler<Integer, AsynchronousSocketChannel> {
        private ByteBuffer buf;
        public ReadFinishHandler(ByteBuffer buf) {
            this.buf = buf;
        }
        @Override
        public void completed(Integer result, AsynchronousSocketChannel attachment) {
            System.out.println("Read resp from client is:");
            String readStr = new String(buf.array(), 0, result);
            System.out.println(readStr);
            ByteBuffer buf = ByteBuffer.allocate(512);
            buf.put(("[ECHO] " + readStr.trim() + "\n").getBytes());
            buf.flip();
            attachment.write(buf, attachment, new WriteFinishHandler());
        }

        @Override
        public void failed(Throwable exc, AsynchronousSocketChannel attachment) {
            System.out.println("Error when reading");
            exc.printStackTrace();
        }
    }

    static class WriteFinishHandler implements CompletionHandler<Integer, AsynchronousSocketChannel> {

        @Override
        public void completed(Integer result, AsynchronousSocketChannel attachment) {
            // 数据已经写完了 等待下一次的数据读取
            System.out.println("write has finished and write bytes - " + result);
            ByteBuffer buf = ByteBuffer.allocate(512);
            attachment.read(buf, attachment, new ReadFinishHandler(buf));
        }

        @Override
        public void failed(Throwable exc, AsynchronousSocketChannel attachment) {
            System.out.println("Error during writing");
            exc.printStackTrace();
        }
    }

    static class AcceptFinishHandler implements CompletionHandler<AsynchronousSocketChannel, Object> {

        @Override
        public void completed(AsynchronousSocketChannel socketChannel, Object attachment) {
            // 因为我们是服务端 那么此时我们应该要准备读取数据了
            ByteBuffer buf = ByteBuffer.allocate(512);
            socketChannel.read(buf, socketChannel, new ReadFinishHandler(buf));
        }

        @Override
        public void failed(Throwable exc, Object attachment) {
            System.out.println("Fail to accept");
            exc.printStackTrace();
        }
    }
}
```

AIO Echo client:

```
package io.aio;

import io.common.InputUtil;
import io.common.ServerInfo;

import java.net.InetSocketAddress;
import java.nio.ByteBuffer;
import java.nio.channels.AsynchronousSocketChannel;
import java.nio.channels.CompletionHandler;
import java.util.concurrent.CountDownLatch;

/**
 * AIO的client 可以看到 大多数时候 它都是注册的一个个的Callback/handler
 * 而且是完全异步的.
 */
public class AioClient {

    public static void main(String[] args) throws Exception {
        AsynchronousSocketChannel socketChannel = AsynchronousSocketChannel.open();
        socketChannel.connect(new InetSocketAddress(ServerInfo.PORT), socketChannel,new ConnectFinishHandler());
        CountDownLatch running = new CountDownLatch(1);
        running.await();
    }

    static class ConnectFinishHandler implements CompletionHandler<Void, AsynchronousSocketChannel> {

        @Override
        public void completed(Void result, AsynchronousSocketChannel socket) {
            // 当连接完成
            // 让我们从准备读取数据并写入到socket
            String readStr = InputUtil.getLine("Input something:");
            ByteBuffer buf = ByteBuffer.allocate(512);
            buf.put((readStr.trim() + "\n").getBytes());
            buf.flip();
            socket.write(buf, socket, new WriteFinishHandler());
        }

        @Override
        public void failed(Throwable exc, AsynchronousSocketChannel attachment) {
            System.out.println("Error");
            exc.printStackTrace();
        }
    }

    static class ReadFinishHandler implements CompletionHandler<Integer, AsynchronousSocketChannel> {
        private ByteBuffer buf;
        public ReadFinishHandler(ByteBuffer buf) {
            this.buf = buf;
        }
        @Override
        public void completed(Integer result, AsynchronousSocketChannel attachment) {
            System.out.println("Read resp from remote is:");
            System.out.println(new String(buf.array(), 0, result));
            // let's get a new string from cmd line

            String readStr = InputUtil.getLine("Input something:");
            ByteBuffer buf = ByteBuffer.allocate(512);
            buf.put((readStr.trim() + "\n").getBytes());
            buf.flip();
            attachment.write(buf, attachment, new WriteFinishHandler());
        }

        @Override
        public void failed(Throwable exc, AsynchronousSocketChannel attachment) {
            System.out.println("Error when reading");
            exc.printStackTrace();
        }
    }

    static class WriteFinishHandler implements CompletionHandler<Integer, AsynchronousSocketChannel> {

        @Override
        public void completed(Integer result, AsynchronousSocketChannel attachment) {
            // already finish writing
            // let's waiting the resp
            ByteBuffer buf = ByteBuffer.allocate(512);
            attachment.read(buf, attachment, new ReadFinishHandler(buf));
        }

        @Override
        public void failed(Throwable exc, AsynchronousSocketChannel attachment) {
            System.out.println("Error when writing");
            exc.printStackTrace();
        }
    }

}
```

### Reactor 和 Proactor

他们两个都是event-driven 的IO模型.  
 不同的是:  
 比较: Reactor: 程序一直等,直到收到Event说, 这个Socket可以读取了, 然后业务线程从它里面读取.  
 Proactor: 程序等待, 直到一个socket读取操作完成. (此时数据应该已在buffer中)

## reference

1.[github code](https://github.com/gaoxingliang/goodutils/tree/master/src/io)  
 2.[2种IO设计模式](http://didawiki.cli.di.unipi.it/lib/exe/fetch.php/magistraleinformatica/tdp/tpd_reactor_proactor.pdf)  
 3.[3种IO](https://www.programering.com/a/MDM0YzMwATE.html)
