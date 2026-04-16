---
layout: post
title: "Tomcat 启动失败 IllegalArgumentException: Malformed"
date: 2014-07-07 20:17:26 +0800
author: gaoxingliang
description: "在一次启动tomcat的过程中报错：java.lang.IllegalArgumentException: Malformed"
categories:
  - 迁移自CSDN
tags:
  - "Tomcat"
  - "IllegalArgumentExcep"
  - "Malformed"
csdn_url: "https://blog.csdn.net/scugxl/article/details/37532521"
---

在一次启动tomcat的过程中报错：

#### java.lang.IllegalArgumentException: Malformed

这个与前面在其他网站上看到的是不同的：java.lang.IllegalArgumentException: Malformed  一般会带有encoding XXX 或者 \u xxxx

但是我看到的错误就只有这个

如何定位：

【1】修改tomcat catanila.jar 中的ContextConfig的源代码：

```
    protected void processAnnotationsJar(URL url, WebXml fragment,
            boolean handlesTypesOnly) {

        Jar jar = null;
        InputStream is;
        
        try {
//        	String t = url.getPath().substring(6);
//        	t = t.substring(0,t.length()-2);
//        	ZipFile zf = new ZipFile(t, "utf-8");
//    		Enumeration e = zf.getEntries();
//    		while(e.hasMoreElements())
//    		{
//    			System.out.println(e.nextElement());
//    		}
//    		zf.closeQuietly(zf);
            jar = JarFactory.newInstance(url);
            log.info("current jar file is:" + jar.getEntryName() + " jar:" + url.getPath());
            jar.nextEntry();
            String entryName = jar.getEntryName();
            while (entryName != null) {
                if (entryName.endsWith(".class")) {
                    is = null;
                    try {
                        is = jar.getEntryInputStream();
                        processAnnotationsStream(
                                is, fragment, handlesTypesOnly);
                    } catch (IOException e) {
                        log.error(sm.getString("contextConfig.inputStreamJar",
                                entryName, url),e);
                    } catch (ClassFormatException e) {
                        log.error(sm.getString("contextConfig.inputStreamJar",
                                entryName, url),e);
                    } finally {
                        if (is != null) {
                            try {
                                is.close();
                            } catch (IOException ioe) {
                                // Ignore
                            }
                        }
                    }
                }
                jar.nextEntry();
                entryName = jar.getEntryName();
            }
        } catch (IOException e) {
            log.error(sm.getString("contextConfig.jarFile", url), e);
        } finally {
            if (jar != null) {
                jar.close();
            }
        }
    }
```

这里可以看到只捕获了IOException，为了定位该问题 在catch 部分，修改如下：

```
    protected void processAnnotationsJar(URL url, WebXml fragment,
            boolean handlesTypesOnly) {

        Jar jar = null;
        InputStream is;
        String entryName = null;
        try {

            jar = JarFactory.newInstance(url);
            log.info("current jar file is:" + jar.getEntryName() + " jar:" + url.getPath());
            jar.nextEntry();
            entryName = jar.getEntryName();
            while (entryName != null) {
                if (entryName.endsWith(".class")) {
                    is = null;
                    try {
                        is = jar.getEntryInputStream();
                        processAnnotationsStream(
                                is, fragment, handlesTypesOnly);
                    } catch (IOException e) {
                        log.error(sm.getString("contextConfig.inputStreamJar",
                                entryName, url),e);
                    } catch (ClassFormatException e) {
                        log.error(sm.getString("contextConfig.inputStreamJar",
                                entryName, url),e);
                    } finally {
                        if (is != null) {
                            try {
                                is.close();
                            } catch (IOException ioe) {
                                // Ignore
                            }
                        }
                    }
                }
                jar.nextEntry();
                entryName = jar.getEntryName();
            }
        } catch (Exception e) {
        	log.warn("current jar:" + url.getPath() + " class:" + entryName);
            log.error(sm.getString("contextConfig.jarFile", url), e);
        } finally {
            if (jar != null) {
                jar.close();
            }
        }
    }
```

这样就可以在错误的时候获取到详细的信息。（替换catalina.jar 中的ContextConfig\*.class ，有内部类）

最后问题得原因一般是：jar包打入了包含**中文的文件名**

如果可以直接调试的话还可以参考tomcat的启动调试：http://blog.csdn.net/scugxl/article/details/37083497
