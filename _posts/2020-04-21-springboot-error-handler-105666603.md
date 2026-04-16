---
layout: post
title: "Springboot error handler是如何工作的?"
date: 2020-04-21 21:06:14 +0800
author: gaoxingliang
description: "背景以前没有怎么接触过springboot, 一直做得偏底层相关的开发, 接触到springboot后发现这个框架实现的非常巧妙, 确实也非常方便.  这篇文章就记录下spring boot中的ErrorHandler是如何实现的.Example示例代码在: github里面的schedulingtask module.大体来说就是://ctrl层会抛出一个异常    public ..."
categories:
  - 迁移自CSDN
tags:
  - "spring"
  - "spring boot"
csdn_url: "https://blog.csdn.net/scugxl/article/details/105666603"
---

## 背景

以前没有怎么接触过springboot, 一直做得偏底层相关的开发, 接触到springboot后发现这个框架实现的非常巧妙, 确实也非常方便. 这篇文章就记录下spring boot中的ErrorHandler是如何实现的.

## Example

示例代码在: [github](https://github.com/gaoxingliang/helloworlds/tree/master/springTutorial)  
 里面的schedulingtask module.  
 大体来说就是:

```
//ctrl层会抛出一个异常
    public void get(@PathVariable(name="id") int id) {
        System.out.println("Got an id  "+ id);
        if (id > 100) {
            throw new MyException("id > 100");
        }
    }
```

全局的errorhandler会捕获异常

```
@ControllerAdvice
public class MyExceptionHandler {

    @ExceptionHandler(value=MyException.class)
    public ErrorResp handleMyEx(MyException e, Locale clientLocale, HttpServletRequest request, HttpServletResponse resp) {
        e.printStackTrace();
        System.out.println("Got on exception");
        System.out.println(request.getHeaderNames());
        System.out.println("Resp obj:" + resp);
        System.out.println("Client locale:" + clientLocale);
        return new ErrorResp(e.getMessage());
    }
}
```

启动应用后访问:

```
http://localhost:9901/api/1000
```

然后日志记录:

```
Got an id  1000
Got on exception
org.apache.tomcat.util.http.NamesEnumerator@1a606245
Resp obj:org.apache.catalina.connector.ResponseFacade@1c4a6382
Client locale:zh_CN
com.example.schedule.exceptionExample.MyException: id > 100
	at com.example.schedule.ctrl.RestCtrlExample.get(RestCtrlExample.java:18)
```

界面显示:

```
Whitelabel Error Page

This application has no explicit mapping for /error, so you are seeing this as a fallback.
Tue Apr 21 20:15:12 CST 2020
There was an unexpected error (type=Not Found, status=404).
id > 100
```

## 我的疑问

1. 这里面的方法名是随意的嘛? 比如handleMyEx
2. 这里面的参数是随便可以写的? 什么参数都支持? 是怎么实现的呢? 比如 MyException e, Local clientLocale
3. 这个返回值又是什么意思? 比如ErrorResp

## 先看API

API在[这里](https://tool.oschina.net/apidocs/apidoc?api=Spring-3.1.1) 虽然版本是3.1.1但是看了下和最新5.2是一样的

```
 Annotation for handling exceptions in specific handler classes and/or handler methods. Provides consistent style between Servlet and Portlet environments, with the semantics adapting to the concrete environment.

Handler methods which are annotated with this annotation are allowed to have very flexible signatures. They may have arguments of the following types, in arbitrary order:

    An exception argument: declared as a general Exception or as a more specific exception. This also serves as a mapping hint if the annotation itself does not narrow the exception types through its value().
    Request and/or response objects (Servlet API or Portlet API). You may choose any specific request/response type, e.g. ServletRequest / HttpServletRequest or PortletRequest / ActionRequest / RenderRequest. Note that in the Portlet case, an explicitly declared action/render argument is also used for mapping specific request types onto a handler method (in case of no other information given that differentiates between action and render requests).
    Session object (Servlet API or Portlet API): either HttpSession or PortletSession. An argument of this type will enforce the presence of a corresponding session. As a consequence, such an argument will never be null. Note that session access may not be thread-safe, in particular in a Servlet environment: Consider switching the "synchronizeOnSession" flag to "true" if multiple requests are allowed to access a session concurrently.
    WebRequest or NativeWebRequest. Allows for generic request parameter access as well as request/session attribute access, without ties to the native Servlet/Portlet API.
    Locale for the current request locale (determined by the most specific locale resolver available, i.e. the configured LocaleResolver in a Servlet environment and the portal locale in a Portlet environment).
    InputStream / Reader for access to the request's content. This will be the raw InputStream/Reader as exposed by the Servlet/Portlet API.
    OutputStream / Writer for generating the response's content. This will be the raw OutputStream/Writer as exposed by the Servlet/Portlet API. 

The following return types are supported for handler methods:

    A ModelAndView object (Servlet MVC or Portlet MVC).
    A Model object, with the view name implicitly determined through a RequestToViewNameTranslator.
    A Map object for exposing a model, with the view name implicitly determined through a RequestToViewNameTranslator.
    A View object.
    A String value which is interpreted as view name.
    void if the method handles the response itself (by writing the response content directly, declaring an argument of type ServletResponse / HttpServletResponse / RenderResponse for that purpose) or if the view name is supposed to be implicitly determined through a RequestToViewNameTranslator (not declaring a response argument in the handler method signature; only applicable in a Servlet environment). 

In Servlet environments, you can combine the ExceptionHandler annotation with @ResponseStatus, to define the response status for the HTTP response.
```

大意就是: 参数是任意的 可以支持各种类型(列出的), 返回值也是可以支持很多类型的

## show me the code

### 我们通过UI触发一个MyException异常

### 在dispatch servlet后我们演示了一个异常

```
org.springframework.web.servlet.DispatcherServlet#doDispatch
大意: 处理请求, 然后看有没有异常, 有异常就设置dispatchException. 然后在:processDispatchResult 处理
try {

				// Determine handler adapter for the current request.
				HandlerAdapter ha = getHandlerAdapter(mappedHandler.getHandler());

				// Actually invoke the handler.
				mv = ha.handle(processedRequest, response, mappedHandler.getHandler());
			}
			catch (Exception ex) {
				dispatchException = ex;
			}
			catch (Throwable err) {
				// As of 4.3, we're processing Errors thrown from handler methods as well,
				// making them available for @ExceptionHandler methods and other scenarios.
				dispatchException = new NestedServletException("Handler dispatch failed", err);
			}
			processDispatchResult(processedRequest, response, mappedHandler, mv, dispatchException);
		
```

### 在org.springframework.web.servlet.DispatcherServlet#processHandlerException中找到处理异常

```
		if (this.handlerExceptionResolvers != null) {
			for (HandlerExceptionResolver resolver : this.handlerExceptionResolvers) {
				exMv = resolver.resolveException(request, response, handler, ex);
				if (exMv != null) {
					break;
				}
			}
		}
```

`handlerExceptionResolvers`有2个(启动时初始化的), 主要关注后面:  
 ![在这里插入图片描述]({{ '/assets/images/posts/springboot-error-handler-105666603/img-001.png' | relative_url }})

### 最终会进入 org.springframework.web.servlet.mvc.method.annotation.ExceptionHandlerExceptionResolver#doResolveHandlerMethodException

这里面的代码比较关键:

```
	protected ModelAndView doResolveHandlerMethodException(HttpServletRequest request,
			HttpServletResponse response, @Nullable HandlerMethod handlerMethod, Exception exception) {

		ServletInvocableHandlerMethod exceptionHandlerMethod = getExceptionHandlerMethod(handlerMethod, exception);
		if (exceptionHandlerMethod == null) {
			return null;
		}

		if (this.argumentResolvers != null) {
			exceptionHandlerMethod.setHandlerMethodArgumentResolvers(this.argumentResolvers);
		}
		if (this.returnValueHandlers != null) {
			exceptionHandlerMethod.setHandlerMethodReturnValueHandlers(this.returnValueHandlers);
		}
```

这里做了2件事: 注册了参数的resolver和返回值的resolver. 然后我们看下有哪些呢?  
 ![在这里插入图片描述]({{ '/assets/images/posts/springboot-error-handler-105666603/img-002.png' | relative_url }})这里面正是我们API里面所提到的哪些支持的参数值和返回值.

### org.springframework.web.servlet.mvc.method.annotation.ServletInvocableHandlerMethod#invokeAndHandle 这里面调用我们处理异常的方法和处理返回值`returnValue`

注意这里面只有3个参数  
 A. webRequest 存储了request and response  
 B. mavContainer 目前没放  
 C. providedArgs 两个, 产生异常的方法: 比如: com.example.schedule.ctrl.RestCtrlExample.get(RestCtrlExample.java:18) 和 产生的异常MyException

![在这里插入图片描述]({{ '/assets/images/posts/springboot-error-handler-105666603/img-003.png' | relative_url }})

### 如何自动填充我们的参数?

```
org.springframework.web.method.support.InvocableHandlerMethod#getMethodArgumentValues
这里面按照如下逻辑:
args = new Object[count]
for (method parameter : paramters) {
    for (Object o : providedArgs) {
      if (o instanceof parameter.getParameteryType) {
     args[i] = o
      }
   }
   // 如果没有找到
   // 调用上面的argumentResolvers
   for (argResolver : argumentResolvers) {
      obj = argResolver.resolve
      if (obj != null)  {
         args[i] = obj
   }
  }
}
```

#### 每个resolver如何解析并生成参数的?

1.判断当前resolver是否支持要生成的参数  
 比如 `org.springframework.web.servlet.mvc.method.annotation.ServletRequestMethodArgumentResolver#supportsParameter`  
 ![在这里插入图片描述]({{ '/assets/images/posts/springboot-error-handler-105666603/img-004.png' | relative_url }})

2.如果支持则设置  
 比如上面的例子: 实际上就是根据最开始的3个参数来生成对应的class类型的参数:  
 ![在这里插入图片描述]({{ '/assets/images/posts/springboot-error-handler-105666603/img-005.png' | relative_url }})

### 调用参数然后返回值

参数生成好了就可以调用了:  
 ![在这里插入图片描述]({{ '/assets/images/posts/springboot-error-handler-105666603/img-006.png' | relative_url }})

```
org.springframework.web.method.support.InvocableHandlerMethod#invokeForRequest
		Object[] args = getMethodArgumentValues(request, mavContainer, providedArgs);
		if (logger.isTraceEnabled()) {
			logger.trace("Arguments: " + Arrays.toString(args));
		}
		return doInvoke(args);
```

### 处理返回值

其实处理返回值跟处理参数argument类似了. 也是通过一堆resolver来动态解析返回值的含义.

```
org.springframework.web.method.support.HandlerMethodReturnValueHandlerComposite#handleReturnValue
```

1. 根据返回值选择对应的resolver  
    根据supportReturnTypes决定是否支持. 比如:

```
org.springframework.web.servlet.mvc.method.annotation.RequestResponseBodyMethodProcessor#supportsReturnType 处理的就是ResponseEntity这种类型的
	@Override
	public boolean supportsReturnType(MethodParameter returnType) {
		return (AnnotatedElementUtils.hasAnnotation(returnType.getContainingClass(), ResponseBody.class) ||
				returnType.hasMethodAnnotation(ResponseBody.class));
	}
```

我们的ErrResponse是:

```
org.springframework.web.method.annotation.ModelAttributeMethodProcessor#supportsReturnType
	/**
	 * Return {@code true} if there is a method-level {@code @ModelAttribute}
	 * or, in default resolution mode, for any return value type that is not
	 * a simple type.
	 */
	@Override
	public boolean supportsReturnType(MethodParameter returnType) {
		return (returnType.hasMethodAnnotation(ModelAttribute.class) ||
				(this.annotationNotRequired && !BeanUtils.isSimpleProperty(returnType.getParameterType())));
	}
```

2. resolver.resolve  
    我们这个最终会映射到/error modelandview. 只是我们没有配置所有才有前面看到的错误页面.

## 另一个疑问?

正常返回时, 我们一般也是返回个对象, 它又是如何渲染成json的呢?
