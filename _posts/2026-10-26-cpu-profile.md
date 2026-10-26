---
layout: post
title: "cpu性能调查问题&jmc使用"
date: 2026-10-26 10:00:00 +0800
author: ed
description: "使用jmc和eclipse memory analyzer 结合的cpu分析技术"
category: 开发
tags:
  - java
  - 性能优化
  - jmc
  - mat
---

# cpu性能调查问题&jmc使用

## 问题

收到生产环境服务器load告警，值在70左右，且存在明显的阶段攀升特点。非常奇怪：

![load告警趋势图](/assets/images/posts/2026-10-26-cpu-profile/image-20261026092744148.png)



##  调查

### 1. 初始调查

结合以往的经验，就是top查看后，直接做jfr（java flight recorder） 数据采集, jfr文件应该可以很方便快速的看到cpu使用瓶颈。

使用如下命令：

```shell
# 1. 使用默认配置（开销更低，适合生产环境长期监控）
jcmd <PID> JFR.start duration=5m filename=prod_recording.jfr settings=profile

# 2. 自定义最大文件大小（防止磁盘写满，达到上限自动截断）
jcmd <PID> JFR.start duration=5m maxsize=500M filename=limited_recording.jfr

# 3. 查看当前正在进行的录制状态
jcmd <PID> JFR.check

# 4. 手动提前停止并导出（无需等满5分钟）
jcmd <PID> JFR.stop name=1 filename=early_stop.jfr
```

如果提示需要unlock：

```shell
jcmd <PID> VM.unlock_commercial_features
```

### 2. 分析jfr

拿到jfr后使用jmc分析（java mission control），这个有版本差异：

| JFR 文件格式 | 生成 JDK | 推荐 JMC 版本     | Hot Methods 支持 |
| ------------ | -------- | ----------------- | ---------------- |
| **v1**       | JDK 8    | **JMC 7.x / 8.x** | ✅ 完整           |
| **v1**       | JDK 8    | JMC 9.x           | ❌ 部分/缺失      |
| **v2**       | JDK 11+  | JMC 8.x / 9.x     | ✅ 完整           |

jmc 8 下载地址：https://jdk.java.net/jmc/8/

jmc 9下载地址：https://jdk.java.net/jmc/9/  

另外jmc，如果需要指定jdk 可以在同目录下的jmc.ini 里面通过如下方式指定：(-vmargs之前使用-vm指定)

```ini
-vm
D:\Program Files\Amazon Corretto\jdk21.0.0_35/bin\javaw.exe
-vmargs
```

![JMC方法概要](/assets/images/posts/2026-10-26-cpu-profile/image-20261026093948709.png)

查看方法概要发现并没有很多方法被异常调用，但是查看进程里面确实检测到cpu很高，且100%，

![CPU使用率](/assets/images/posts/2026-10-26-cpu-profile/image-20261026094100996.png)

这时候其实已经有点怀疑是死循环了，但是之前也遇到过线程频繁切换导致的load偏高，所以也看了下也不是，

```shell
# 同时观察 CPU、上下文切换、运行队列
vmstat 1 10
```



怀疑是线程里面的调用除了问题。

### 3. jstack

用jstack跑了

```shell
# 方法一：async-profiler（强烈推荐，不受 CPU 饱和影响）
# 它使用 OS 级别的 perf_event 或 itimer 信号，不依赖 JVM 内部线程
# 下载: https://github.com/async-profiler/async-profiler/releases   (没用这个)
./asprof -d 30 -f /tmp/cpu_profile.html 1

# 方法二：手动 jstack 采样（最可靠，零额外开销）
# 连续抓 20 次，每次间隔 500ms，然后统计出现频率最高的栈帧
for i in $(seq 1 20); do
  jstack 1 >> /tmp/jstack_all.txt
  echo "---SEPARATOR---" >> /tmp/jstack_all.txt
  sleep 0.5
done

# 统计热点方法（提取栈顶方法名）
grep -E "^\tat " /tmp/jstack_all.txt | sed 's/^\t*//' | sort | uniq -c | sort -rn | head -20
```

最终发现了就是如下方法导致的死循环，发现多个线程都在执行一模一样的代码：

```java
    /**
     * 去除数字尾部的0
     *
     * @param source 数字字符串
     * @return 如果为空则返回0，不为空则返回原值
     */
    public static Long removeZeroTails(String source) {
        Long result = null;
        if (Objects.nonNull(source) && isNumber(source)) {
            result = areaCodeTailCache.getIfPresent(source);
            if (result == null) {
                // 优先去掉三个0，即乡村级别的0，接着去掉省市县级别的两位的0
                while (source.endsWith(THREE_ZERO) || source.endsWith(DOUBLE_ZERO)) {
                    source = source.substring(0, source.length() - getReduction(source));
                }
                result = Long.parseLong(source);
                areaCodeTailCache.put(source, result);
            }
        }

        return result;
    }


    private static int getReduction(String source) {
        int result = 0;
        if (source.endsWith(THREE_ZERO) && source.length() > 6) {
            result = 3;
        } else if (source.endsWith(DOUBLE_ZERO) && source.length() <= 6) {
            result = 2;
        }

        return result;
    } 
```

这个方法，让ai看了下对于：

```shell
**是的，存在死循环风险。**

问题出在 `getReduction` 方法的逻辑缺陷上。当字符串同时满足以下条件时会发生死循环：

1. 长度 > 6
2. 以 `"00"` 结尾
3. **但不以 `"000"` 结尾**
```

到这里基本确认了确实会这样，那么到底是不是这样呢？如果是是什么字符串导致的呢？是否如ai的分析？

### 4. 深入调查和获取参数

（a）看了下前后代码并没有记录参数

（b）又尝试使用ali的arthas工具获取： 并没有获取到参数，<font color=red> 怀疑是已经在死循环了已经没有机会通过字节码增强的方式查看了</font>

```
java -jar arthas-boot.jar 1   # 直接传入目标PID


# 2. 抓取 removeZeroTails 的入参、返回值和执行耗时
# -n 5: 只抓5次就自动停止，防止把高负载系统打挂
# -x 3: 展开对象深度为3层，足够看清String内容
# -c: 按条件过滤（可选），比如只看长度>10的异常入参
watch cn.xx.util.AreaCodeUtils removeZeroTails '{params[0], returnObj, throwExp}' -x 3 -n 5 -b -f

```



### 5. 还得是jmap+mat

所以最后还是用jmap采集了memory dump然后用[eclipse mat](https://eclipse.dev/mat/download/) 进行分析：

```shell
 jmap -dump:live,format=b,file=heap.hprof 1
 
```

eclipse mat指定jvm和参数，方便打开大文件：在对应目录的MemoryAnalyzer.ini里面：

```ini
-vm
D:\Program Files\Amazon Corretto\jdk21.0.0_35/bin\java.exe
-startup
。。。
-vmargs
--add-exports=java.base/jdk.internal.org.objectweb.asm=ALL-UNNAMED
-Xmx4096m

```

然后使用如下的正则来搜索：

```sql
SELECT DISTINCT s.toString() AS str FROM java.lang.String s WHERE (
    (s.toString() != null) 
    and s.toString().matches("^51.*(?<!0)00$")
)
--  oql的正则好像是js的语法，这个是ai写的。 

```

然后我就得到了下面的字符串列表：

![字符串列表查询结果](/assets/images/posts/2026-10-26-cpu-profile/image-20261026103417402.png)









## 总结

1，如果cpu持续100%，可以怀疑是死循环。

2，如果呈现阶梯状分布，大概是某个代码/特定模式导致的。

3，oql的语法很多ai也是乱说的 需要给出合适的参考文档语法。

4，ai很容易胡言乱语，需要多引导到正确的怀疑方向， 但是也不得不多说有时候ai可以给出思路。



---

