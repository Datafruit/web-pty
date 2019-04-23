import * as pty from 'node-pty'
// import { ITerminal } from 'node-pty/lib/interfaces';
import * as io from 'socket.io'

export default class TTY {

	//连接
	private tty: any
	private sock: any

	public ondata!: (...args: Array<any>) => any;
	public onclose!: (...args: Array<any>) => any;

	/**
	 * 創建一個tty
	 */
	constructor(host: string, user: string, port: number = 22, width: number, height: number) {
		this.tty = pty.spawn('ssh', ['-p', port + '', user + '@' + host], {
			name: 'builtin_xterm',
			cols: width,
			rows: height,
			cwd: process.env.HOME,
			env: process.env as any
		})
		this.tty.on('data', (...data: any) => {
			this.ondata && this.ondata(...data)
		})
		this.tty.on('close', () => {
			this.onclose && this.onclose()
		})
	}

	/**
	 * 更改tty的寬高
	 * @param width 寬度
	 * @param height 高度
	 */
	resize(width: number, height: number): this {
		this.tty.resize(width, height)
		return this
	}

	/**
	 * 設置客戶端練級
	 * @param socket 客戶端連接
	 */
	socket(socket: any) {
		this.socket = socket
	}

	/**
	 * 寫入數據到tty
	 * @param data 要寫入的數據
	 */
	write(data: any) {
		this.tty.write(data)
	}

	/**
	 * 結束一個連接
	 */
	end() {
		this.tty.kill()
		this.tty.destroy()
	}
}