import * as http from 'http'
import * as https from 'https'
import * as io from 'socket.io'

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



declare namespace web_pty {


	/**
	 * 創建pty
	 * @param server http或https服務器
	 */
	export function mkpty(server: http.Server | https.Server, ioServer: io.Server): any

	/**
	 * 靜態資源中間件
	 */
	export const res: {
		/**
		 * express中間件
		 */
		express: (req: any, res: any) => any,
		//koa中間件
		koa: (ctx: any, next: any) => any
	}

	/**
	 * 配置pty
	 * @param opt 配置選項
	 */
	export function config(opt: ConfigOption): any
}

export = web_pty
