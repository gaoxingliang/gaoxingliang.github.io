---
layout: post
title: "[Springboot编程思想]ch2-springboot是如何启动的?"
date: 2020-06-01 15:39:49 +0800
author: gaoxingliang
description: "Abstract弄清楚springboot的jar模式是如何启动的?  代码在: github我们如何生成单个可执行的jar?maven 引入:spring-boot-maven-plugin 中的repackage 任务:\t<build>\t\t<plugins>\t\t\t<!-- 保持与 spring-boot-dependencies 版本一致 -->\t\t\t<plugin>\t\t\t\t<groupId>org.apache.maven.p"
categories:
  - 迁移自CSDN
tags:
  - "spring boot"
csdn_url: "https://blog.csdn.net/scugxl/article/details/106469683"
---

## Abstract

弄清楚springboot的jar模式是如何启动的? 代码在: [github](https://github.com/gaoxingliang/thinking-in-spring-boot-samples/tree/master/spring-boot-2.0-samples/first-spring-boot-application)

## 我们如何生成单个可执行的jar?

maven 引入:`spring-boot-maven-plugin` 中的`repackage` 任务:

```
	<build>
		<plugins>
			<!-- 保持与 spring-boot-dependencies 版本一致 -->
			<plugin>
				<groupId>org.apache.maven.plugins</groupId>
				<artifactId>maven-compiler-plugin</artifactId>
				<version>3.7.0</version>
				<configuration>
					<source>${java.version}</source>
					<target>${java.version}</target>
				</configuration>
			</plugin>

			<!-- 保持与 spring-boot-dependencies 版本一致 -->
			<plugin>
				<groupId>org.apache.maven.plugins</groupId>
				<artifactId>maven-war-plugin</artifactId>
				<version>3.1.0</version>
			</plugin>

			<plugin>
				<groupId>org.springframework.boot</groupId>
				<artifactId>spring-boot-maven-plugin</artifactId>
				<version>2.0.2.RELEASE</version>
				<executions>
					<execution>
						<goals>
							<goal>repackage</goal>
						</goals>
					</execution>
				</executions>
			</plugin>
		</plugins>
	</build>
```

打包: `mvn package`

gradle: 使用这个plugin后 有一个任务`bootJar`

```
apply plugin: 'org.springframework.boot'

or:
plugins {
	id 'org.springframework.boot' version '2.0.2.RELEASE'
	id 'io.spring.dependency-management' version '1.0.9.RELEASE'
	id 'java'
}
```

打包: `gradle bootJar`

## 细节

查看解压生成的jar

```
.
├── BOOT-INF
│   ├── classes
│   │   └── thinking
│   │       └── in
│   │           └── spring
│   │               └── boot
│   │                   └── App.class
│   └── lib
│       ├── ....省略了
│       ├── spring-boot-starter-web-2.0.2.RELEASE.jar
│       ├── spring-context-5.0.6.RELEASE.jar
│       ├── spring-core-5.0.6.RELEASE.jar
│       ├── spring-expression-5.0.6.RELEASE.jar
├── META-INF
│   ├── MANIFEST.MF
│   └── maven
│       └── thinking-in-spring-boot
│           └── first-spring-boot-application
│               ├── pom.properties
│               └── pom.xml
└── org
    └── springframework
        └── boot
            └── loader
                ├── ExecutableArchiveLauncher.class
                ├── JarLauncher.class
                ├── .....省略了
                └── util
                    └── SystemPropertyUtils.class

19 directories, 90 files
```

可以看到如下的文件夹:

```
/BOOT-INF/classes 存储我们自己写的代码
/BOOT-INF/libs 存储所有的jar包括依赖的
org - spring引导代码springbootloader
```

查看manifest:

```
Manifest-Version: 1.0
Implementation-Title: 《Spring Boot 编程思想》第一个 Spring B
 oot 应用
Implementation-Version: 1.0.0-SNAPSHOT
Built-By: edward
Implementation-Vendor-Id: thinking-in-spring-boot
Spring-Boot-Version: 2.0.2.RELEASE
Main-Class: org.springframework.boot.loader.JarLauncher
Start-Class: thinking.in.spring.boot.App
Spring-Boot-Classes: BOOT-INF/classes/
Spring-Boot-Lib: BOOT-INF/lib/
Created-By: Apache Maven 3.6.3
Build-Jdk: 1.8.0_181
Implementation-URL: http://maven.apache.org
```

注意配置:`Main-Class: org.springframework.boot.loader.JarLauncher`和配置`Start-Class: thinking.in.spring.boot.App`. java入口类JarLauncher. 我们代码入口类App.

```
public class JarLauncher extends ExecutableArchiveLauncher {

	static final String BOOT_INF_CLASSES = "BOOT-INF/classes/";

	static final String BOOT_INF_LIB = "BOOT-INF/lib/";

	public JarLauncher() {
	}

	protected JarLauncher(Archive archive) {
		super(archive);
	}

	@Override
	protected boolean isNestedArchive(Archive.Entry entry) {
		if (entry.isDirectory()) {
			return entry.getName().equals(BOOT_INF_CLASSES);
		}
		return entry.getName().startsWith(BOOT_INF_LIB);
	}

	public static void main(String[] args) throws Exception {
		new JarLauncher().launch(args);
	}
```

JarLauncher 反射调用StartClass的main方法(MainMethodRunner)

```
	public void run() throws Exception {
		Class<?> mainClass = Thread.currentThread().getContextClassLoader()
				.loadClass(this.mainClassName);
		Method mainMethod = mainClass.getDeclaredMethod("main", String[].class);
		mainMethod.invoke(null, new Object[] { this.args });
	}
```

## 问题

这里有个问题, 就是我们看到springboot打的jar都在boot-inf/libs里面, 这些jar是怎么被加载的呢?  
 答案就是URL

```
org.springframework.boot.loader.jar.JarFile#registerUrlProtocolHandler
	private static final String HANDLERS_PACKAGE = "org.springframework.boot.loader";
新增了自己的url handler
```

sun的实现:

```
java.net.URL#lookupViaProperty
    private static URLStreamHandler lookupViaProperty(String protocol) {
        String packagePrefixList = GetPropertyAction.privilegedGetProperty("java.protocol.handler.pkgs");
        if (packagePrefixList == null) {
            return null;
        } else {
            String[] packagePrefixes = packagePrefixList.split("\\|");
            URLStreamHandler handler = null;

            for(int i = 0; handler == null && i < packagePrefixes.length; ++i) {
                String packagePrefix = packagePrefixes[i].trim();

                try {
                    String clsName = packagePrefix + "." + protocol + ".Handler";
                    Class cls = null;

                    try {
                        cls = Class.forName(clsName);
                    } catch (ClassNotFoundException var10) {
                        ClassLoader cl = ClassLoader.getSystemClassLoader();
                        if (cl != null) {
                            cls = cl.loadClass(clsName);
                        }
                    }

                    if (cls != null) {
                        Object tmp = cls.newInstance();
                        handler = (URLStreamHandler)tmp;
                    }
                } catch (Exception var11) {
                }
            }

            return handler;
        }
    }
```

所以这里就会找到:  
 org.springframework.boot.loader.jar.Handler

## 调试springboot启动过程jar加载

在上面的github例子打成jar包后:

```
java -agentlib:jdwp=transport=dt_socket,server=y,suspend=y,address=6005 -jar first-spring-boot-application-1.0.0-SNAPSHOT.jar
```

该进程会一直卡住 知道remote debug连接:  
 ![在这里插入图片描述]({{ '/assets/images/posts/springboot-ch2-springboot-106469683/img-001.png' | relative_url }})springboot如何加载类:  
 `org.springframework.boot.loader.LaunchedURLClassLoader#loadClass`  
 Step0: 创建classloader(这里初始化urlclasspath中包含很多urls)  
 ![在这里插入图片描述]({{ '/assets/images/posts/springboot-ch2-springboot-106469683/img-002.png' | relative_url }})  
 step1:  
 ![在这里插入图片描述]({{ '/assets/images/posts/springboot-ch2-springboot-106469683/img-003.png' | relative_url }})step2: 找类:

```
java.lang.ClassLoader#loadClass(java.lang.String, boolean)
大体代码:  
1. 如果有父类加载器: parentClzLoader.loadClass
2. 如果没有, 调用: 调用boostrap clz loader java.lang.ClassLoader#findBootstrapClass
3. 经过1或者2后还是没有 调用自己的findClass
4. 因为LanchedClassLoader继承了URLClassLoader所以代码如下:
```

`java.net.URLClassLoader#findClass`这里用到了前面生成初始化好的ucp(包含很多jarlib url):  
 ![在这里插入图片描述]({{ '/assets/images/posts/springboot-ch2-springboot-106469683/img-004.png' | relative_url }})![在这里插入图片描述]({{ '/assets/images/posts/springboot-ch2-springboot-106469683/img-005.png' | relative_url }})
