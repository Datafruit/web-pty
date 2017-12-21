# WEB-PTY

web-pty是一个浏览器端的ssh工具，通过此工具，可以在浏览器中远程连接到linux服务器并进行管理，同时web-pty支持express和koa框架

![登录界面](https://github.com/kangkang520/web-pty/blob/master/img/pty1.png?raw=true)
![输入密码界面](https://github.com/kangkang520/web-pty/blob/master/img/pty2.png?raw=true)
![操作界面](https://github.com/kangkang520/web-pty/blob/master/img/pty3.png?raw=true)

## 安装
```
npm install --save web-pty
```

## 嵌入到HTML

给任意一个div加上“web-tpy-render”属性就可以将一个terminal嵌入到页面上，所有可用的属性有：

* web-tpy-render（必须，带有此属性的div将会作为terminal渲染）
* pty="xxx"（可选，指定terminal的名称，通过webpty.getByName函数可以获取它）
* icon-color="xxx"（可选，指定标题上图标的颜色）

例如：
```html
<!-- 导入相应的资源，“/res/tty/:type”路由是有服务器指定的 -->
<head>
	...
	<script src="/res/pty/socket"></script>
	<script src="/res/pty/terminal"></script>
	<script src="/res/pty/pty"></script>
	<link rel="stylesheet" href="/res/pty/style">
	...
</head>
```
```html
<!-- 创建容器，当然，你也可以创建多个容器 -->
<body>
	<div style="width:800px; height:800px;" web-tpy-render pty="myPty">
		无法渲染Terminal
	</div>
</body>
```

```html
<script>
	// 配置web-pty，这里只有url一项配置，如果不配置url则使用默认的url
	// webtpy.config({ url: 'ws://alhost:3000' })
	//进行渲染
	webpty.render()
</script>
```

## 在express中使用web-pty

```js
const express = require('express')
const http = require('http')
const fs = require('fs')
const path = require('path')
const pty = require('web-pty')

let app = express()

//配置静态资源的路由，路由中必须有type参数（非常重要）
app.use('/res/pty/:type', tty.res.express)

//随便返回一个页面
app.get('/', (req, res) => {
	res.end(fs.readFileSync(path.join(__dirname, './index.html')) + '')
})

//创建服务
let server = http.createServer(app)

//监听
server.listen(3000, () => console.log('监听端口：3000'))

//创建pty（非常重要）
pty.mkpty(server)
```


## 在koa中使用web-pty

```js
const http = require('http')
const fs = require('fs')
const path = require('path')
const pty = require('./../dist')
const Koa = require('koa')
var Router = require('koa-router');

//创建APP和路由
const app = new Koa();
const router = new Router()

//设置静态资源路径，同express
router.all('/res/tty/:type', tty.res.koa)

//返回一个html给浏览器
router.get('/', (ctx, next) => {
	ctx.set('Content-Type', 'text/html')
	ctx.body = fs.readFileSync(path.join(__dirname, './index.html'))
})

//将路由加入应用
app.use(router.routes())

//创建服务
let server = http.createServer(app.callback())
server.listen(3000, () => console.log('监听：3000'))

//和express一样，创建pty
pty.mkpty(server)
```

## 服务器API

### 创建pty
```js
pty.mkpty(server)
```

### express框架的静态资源中间件
```js
pty.res.express
```

### koa框架的静态资源中间件
```js
pty.res.koa
```

### pty配置
```typescript
 pty.config(option: {
	//是否允许使用本地主机（localhost、 127.0.0.1、 0.0.0.0），默认false
	allowLocal:boolean
	//语言配置
	language?: {
		userName?: string            //用户名
		host?: string                //域名
		port?: string                //端口
		title?: string               //标题
		button?: string              //按钮文本
		buttonWaiting?: string       //等待文本
		inputError?: string          //输入错误提示文本
		inputLocalError?: string     //不能使用本地ip错误文本
		socketDisconnected?: string  //socket断开连接
		ttyClosed?: string           //pty终止
		ttyCreated?: string          //pty创建成功
	}})
```

## 浏览器API - PTY

### pty配置
```ts
webpty.config({url: string})
```

### 渲染terminal
```ts
webpty.render()
```

### 通过名字获取terminal
```ts
webpty.getByName(name:string)
```

### 获取所有terminal
```ts
webpty.terminals
```

## 浏览器API - TERMINAL

通过webpty.getByName函数，或者webpty.terminals可以得到某一个terminal

### 让terminal得到焦点
```ts
pty.focus()
```

### 让terminal失去焦点
```ts
pty.blur()
```

### 取得terminal的名称
```ts
pty.name
```