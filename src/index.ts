import * as http from 'http'
import * as https from 'https'
import * as io from 'socket.io'
import * as fs from 'fs'
import * as path from 'path'
import TTY from './lib/tty'

import { execSync } from 'child_process'


type Server = http.Server | https.Server

type ConfigOption = {
	allowLocal?: boolean				//是否允许本地主机
	language?: {
		userName?: string				//用戶名
		host?: string					//域名
		port?: string					//端口
		title?: string					//標題
		button?: string					//按鈕文本
		buttonWaiting?: string			//等待文本
		inputError?: string				//輸入錯誤提示
		inputLocalError?: string		//不能使用本機ip錯誤提示
		socketDisconnected?: string		//socket断开连接
		ttyClosed?: string				//tty终止
		ttyCreated?: string			//socket连接成功
	}
}

const configs: ConfigOption = {
	allowLocal: false,
	language: {
		userName: '用户名',
		host: '主机名',
		port: '端口',
		title: '登录Linux',
		button: '连接',
		buttonWaiting: '请稍后...',
		inputError: '输入不完整',
		inputLocalError: '不能使用本机地址',
		socketDisconnected: '连接已断开',
		ttyClosed: 'TTY已终止',
		ttyCreated: 'TTY创建成功',
	}
}

/**
 * 創建一個tty
 * @param server http或https服務器
 */
function mkpty(server: Server) {
	io(server).on('connection', socket => {
		const send = (id: number, type: string, msg: any = {}) => socket.emit(type, { id, msg })
		//tty
		let ttys: { [i: number]: TTY } = {}
		socket.on('create', ({ id, msg }) => {
			let tty = new TTY(msg.host, msg.user, msg.port, msg.width, msg.height)
			send(id, 'create')
			ttys[id] = tty
			tty.ondata = data => send(id, 'data', data)
			tty.onclose = () => send(id, 'close')
		})
		socket.on('data', ({ id, msg }) => {
			ttys[id] && ttys[id].write(msg)
		})
		socket.on('resize', ({ id, msg }) => {
			ttys[id] && ttys[id].resize(msg.cols, msg.rows)
		})
		socket.on('disconnect', () => Object.keys(ttys).forEach((k: any) => ttys[k].end()))
	})
}

//中間件cache
const resCache = {
	socket: '',
	terminal: '',
	pty: '',
	style: ''
}

/**
 * 获取某类型的资源
 * @param type 资源类型
 */
function resof(type: string) {
	// resCache.pty = ''
	// resCache.socket = ''
	// resCache.style = ''
	// resCache.terminal = ''
	// if (type == 'pty') execSync('npm run build', { env: process.env, cwd: path.join(__dirname, './../') })
	
	let str: string = ''
	let mime: string = ''
	if (type == 'socket') {
		resCache.socket = resCache.socket || (fs.readFileSync(path.join(__dirname, './../res/socket.js')) + '')
		str = resCache.socket
		mime = 'application/javascript'
	}
	else if (type == 'terminal') {
		resCache.terminal = resCache.terminal || (fs.readFileSync(path.join(__dirname, './../res/xterm.min.js')) + '')
		str = resCache.terminal
		mime = 'application/javascript'
	}
	else if (type == 'pty') {
		resCache.pty = resCache.pty || (fs.readFileSync(path.join(__dirname, './browser/tty.min.js')) + `
		(function(){
			window.webpty.language = ${JSON.stringify(configs.language)}
			window.webpty.allowLocal = ${configs.allowLocal ? 'true' : 'false'}
		})()
		`)
		str = resCache.pty
		mime = 'application/javascript'
	}
	else if (type == 'style') {
		resCache.style = resCache.style || (fs.readFileSync(path.join(__dirname, './../res/xterm.min.css')) + '\r\n\r\n\r\n'
			+ fs.readFileSync(path.join(__dirname, './../res/tty.min.css')))
		str = resCache.style
		mime = 'text/css'
	}
	return [str, mime]
}

/**
 * 资源操作
 */
const res = {
	express: (req: any, res: any) => {
		let [str, mime] = resof(req.params.type)
		mime && res.set('Content-Type', mime)
		res.end(str)
	},
	koa: (ctx: any, next: any) => {
		let [str, mime] = resof(ctx.params.type)
		ctx.body = str
		if (mime) ctx.type = mime
	}
}

/**
 * 設置web-tty屬性
 * @param conf 配置項
 */
const config = (conf: ConfigOption) => {
	Object.keys(conf).forEach(k => {
		//語言項
		if (k == 'language') {
			Object.keys((conf as any)[k]).forEach(lk => {
				(configs as any)[k][lk] = (conf as any)[k][lk]
			})
		}
		//普通項
		else {
			(configs as any)[k] = (conf as any)[k]
		}
	})
}

export {
	mkpty,
	res,
	config
}