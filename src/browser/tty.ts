//擴展window
type _Window = Window & {
	webpty: any,
	io: any,
	Terminal: any
}

//配置項
type TTYConfigOption = {
	url: string
}

//字符屬性定義
type CharState = {
	color: string				//文字顏色
	background: string			//背景顏色
	width: number				//寬度，0、1或2
	char: string				//字符
}

(function (win: _Window) {
	//tty列表
	let ttys: Array<TTY> = []
	//配置選項
	let option: TTYConfigOption = { url: '' }
	//最大ID
	let maxID = 1;

	let svg = (color: string) => ({
		terminal: '<svg t="1513787936520" class="icon" style="width: 1em; height: 1em;vertical-align: middle;fill: currentColor;overflow: hidden;" viewBox="0 0 1024 1024" version="1.1" xmlns="http://www.w3.org/2000/svg" p-id="1886"><path d="M895.5 127 127.5 127c-35.35 0-64 28.65-64 64l0 640c0 35.35 28.65 64 64 64l768 0c35.35 0 64-28.65 64-64L959.5 191C959.5 155.65 930.85 127 895.5 127zM191.5 575l128-128L191.5 319l64-64 192 192L255.5 639 191.5 575zM703.5 639 447.5 639l0-64 256 0L703.5 639z" p-id="1887" fill="' + color + '" data-spm-anchor-id="a313x.7781069.0.i0"></path></svg>'
	})

	//加載fit插件
	//win.Terminal.loadAddon('fit')

	class Socket {
		//socket
		private sock: any
		private ttys: { [i: number]: TTY } = {}

		constructor() {
			let sock = win.io(option.url)
			sock.on('connect', () => this.sock = sock)
			//創建tty成功
			sock.on('create', ({ id }: any) => this.ttys[id] && this.ttys[id].onCreate())
			//收到數據
			sock.on('data', ({ id, msg }: any) => this.ttys[id] && this.ttys[id].onData(msg))
			//tty關閉調用
			sock.on('close', ({ id }: any) => this.ttys[id] && this.ttys[id].onClose())
			//斷開連接
			sock.on('disconnect', () => Object.keys(this.ttys).forEach(key => this.ttys[key as any].onDisconnect()))
		}

		/**
		 * 發送消息
		 * @param type 消息類型
		 * @param msg 消息內容
		 */
		send(id: number, type: string, msg: any = {}) {
			this.sock.emit(type, { id, msg })
		}

		/**
		 * 創建一個tty
		 * @param tty tty
		 * @param host 主機
		 * @param port 端口
		 * @param user 用戶
		 * @param width 列數
		 * @param height 行數
		 */
		createTTY(tty: TTY, host: string, port: number, user: string, width: number, height: number) {
			this.send(tty.id, 'create', { host, port, user, width, height })
			this.ttys[tty.id] = tty
		}
	}
	//提供一個公共的變量
	let socket: Socket;

	//tty類
	class TTY {
		//主要dom
		private dom: HTMLDivElement
		//tty名稱
		private _name: string
		//tty的唯一表示
		private ID: number = maxID++
		//xterm.js的Terminal对象
		private terminal: any
		//登录dom
		private loginDom: HTMLDivElement
		//登录按钮
		private loginBtn: HTMLInputElement
		//输入框
		private inputs: {
			host: HTMLInputElement
			port: HTMLInputElement
			user: HTMLInputElement
		}
		//存放dom的寬度和高度
		private bufferSize = {
			width: 0,
			height: 0
		}
		//圖標顏色
		private iconColor: string = '#e91e63'

		/**
		 * 構造函數
		 * @param dom dom元素
		 */
		constructor(dom: HTMLDivElement) {
			//清空內容
			dom.innerHTML = ''
			//獲取tty名稱
      this._name = dom.getAttribute('tty') || ''
      this.inputs = {} as any
      this.loginBtn = null as any
      this.loginDom = null as any
			this.iconColor = dom.getAttribute('icon-color') || this.iconColor
			//設置padding為0
			css(dom, { padding: '0', overflow: 'hidden', minWidth: '480px', minHeight: '320px' })
			//追加一個dom用於包裹內容
			this.dom = document.createElement('div')
			css(this.dom, { position: 'relative', width: '100%', height: '100%' })
			this.dom.className = 'webpty-container'
			dom.appendChild(this.dom)
			//設置canvas
			this.mkTerminal()
			//設置表單
			this.mkForm()
			//處理表單提交消息
			this.listenForm()
			//檢查窗口大小
			this.checkSize()
			setInterval(this.checkSize.bind(this), 1000)
			//清除背景色
			let termDoms = this.dom.querySelectorAll('.terminal')
			for (let i = 0; i < termDoms.length; i++) css(termDoms.item(i) as HTMLDivElement, { backgroundColor: 'transparent' })
			let viewDoms = this.dom.querySelectorAll('.xterm-viewport')
			for (let i = 0; i < viewDoms.length; i++) css(viewDoms.item(i) as HTMLDivElement, { backgroundColor: 'transparent' })
		}

		/**
		 * 用於檢查tty的大小
		 */
		private checkSize() {
			if (!this.terminal) return
			let { clientWidth, clientHeight } = this.dom
			if (clientWidth != this.bufferSize.width || clientHeight != this.bufferSize.height) {
				this.bufferSize.width = clientWidth
				this.bufferSize.height = clientHeight
				let dom = this.terminal.rowContainer.firstElementChild
				let contentBuffer = dom.innerHTML
				dom.style.display = 'inline'
				dom.innerHTML = 'W'
				let bound = dom.getBoundingClientRect()
				dom.style.display = ''
				dom.innerHTML = contentBuffer
				let rows = parseInt(clientHeight / bound.height as any)
				let cols = parseInt((clientWidth - 10) / bound.width as any)
				this.terminal.resize(cols, rows)
			}
		}

		/**
		 * 獲取tty的id
		 */
		get id(): number {
			return this.ID
		}

		/**
		 * 获取tty名称
		 */
		get name(): string | null {
			return this._name || null
		}

		/**
		 * 初始化Terminal
		 */
		private mkTerminal() {
			//創建一個container
			let container = document.createElement('div')
			css(container, { position: 'absolute', left: '0', top: '0', right: '0', bottom: '0' })
			this.dom.appendChild(container)
			//加載terminal
			this.terminal = new win.Terminal({ cursorBlink: true })
			this.terminal.open(container)
			this.terminal.on('data', (data: any) => {
				socket && socket.send(this.id, 'data', data)
			})
			this.terminal.on('resize', ({ rows, cols }: any) => {
				socket && socket.send(this.id, 'resize', { rows, cols })
			})
		}

		/**
		 * 構建一個表單用於登錄到服務器
		 */
		private mkForm() {
			let createInput = function (title: string, password: boolean, placeholder: string, val: string): [HTMLInputElement, HTMLDivElement] {
				let input = elem('input', { width: '200px' })
				input.className = 'webpty-login-input'
				if (password) input.type = 'password'
				if (placeholder) input.placeholder = placeholder
				if (val) input.value = val
				let div = elem('div', { textAlign: 'center', marginTop: '20px', paddingRight: '100px' })
				let titleElem = elem('div', { display: 'inline-block', width: '150px', textAlign: 'right', paddingRight: '20px' })
				titleElem.innerHTML = title
				titleElem.className = 'webpty-login-label'
				div.appendChild(titleElem)
				div.appendChild(input)
				return [input, div]
			}
			let dom = elem('div', { position: 'absolute', left: '0', top: '0', right: '0', bottom: '0' })
			dom.className = 'webpty-login-body'
			//標題
			let title = elem('div', { padding: '0', margin: '0', position: 'relative' })
			title.className = 'webpty-login-title'
			title.innerHTML = '<span style="position:absolute; left:20px; top:0; bottom:0; font-size:28px; line-height:56px">' + svg(this.iconColor).terminal + '</span>' + win.webpty.language.title
			dom.appendChild(title)
			//輸入框
			let [host, hostDiv] = createInput(win.webpty.language.host + ':', false, '', '')
			let [port, portDiv] = createInput(win.webpty.language.port + ':', false, '', '22')
			let [userName, userNameDiv] = createInput(win.webpty.language.userName + ':', false, '', 'root')
			dom.appendChild(hostDiv)
			dom.appendChild(portDiv)
			dom.appendChild(userNameDiv)
			//連接按鈕
			let [btn, btnDiv] = createInput('&nbsp;', false, '', win.webpty.language.button)
			dom.appendChild(btnDiv)
			btn.type = 'button'
			css(btn, { height: '', borderRadius: '', border: '' })
			btn.className = 'webpty-login-btn'
			css(btnDiv, { marginTop: '20px' })
			css(hostDiv, { marginTop: '40px' })
			this.dom.appendChild(dom)
			this.loginDom = dom
			this.loginBtn = btn
			this.inputs = { host, port, user: userName }
		}

		/**
		 * 監聽表單提交
		 */
		private listenForm() {
			this.loginBtn.onclick = () => {
				//讀取輸入
				let host = this.inputs.host.value.trim()
				let port = this.inputs.port.value.trim() || '22'
				let user = this.inputs.user.value.trim()
				if (!host || !user) {
					this.toast(win.webpty.language.inputError)
					return
				}
				if (!win.webpty.allowLocal && (host == 'localhost' || host == '127.0.0.1' || host == '0.0.0.0')) {
					this.toast(win.webpty.language.inputLocalError)
					return
				}
				//連接
				this.terminal.clear()
				this.terminal.focus()
				socket.createTTY(this, host, parseInt(port), user, this.terminal.cols, this.terminal.rows)
				this.loginBtn.disabled = true
				this.loginBtn.value = win.webpty.language.buttonWaiting
			}
		}

		/**
		 * 連接創建成功調用
		 */
		public onCreate() {
			this.loginBtn.disabled = false
			this.loginBtn.value = win.webpty.language.button
			css(this.loginDom, { display: 'none' })
			this.toast(win.webpty.language.ttyCreated)
		}

		/**
		 * 收到數據時調用
		 * @param data 收到的數據
		 */
		public onData(data: string) {
			this.terminal.write(data)
		}

		/**
		 * 連接斷開時調用
		 */
		public onDisconnect(showToast: boolean = true) {
			css(this.loginDom, { display: 'block' })
			this.terminal.clear()
			if (showToast) this.toast(win.webpty.language.socketDisconnected)
		}

		/**
		 * tty中斷后調用
		 */
		public onClose() {
			this.onDisconnect(false)
			this.toast(win.webpty.language.ttyClosed)
		}

		/**
		 * 显示吐司
		 * @param text 提示文本
		 */
		private toast(text: string) {
			let toast = elem('div')
			toast.className = 'webpty-toast'
			toast.innerHTML = text
			this.dom.appendChild(toast)
			let left = parseInt((this.dom.clientWidth - toast.clientWidth) / 2 as any) + 'px'
			css(toast, { left })
			setTimeout(() => css(toast, { transform: 'translateY(0px)', opacity: '1' }), 20)
			setTimeout(() => css(toast, { opacity: '0' }), 4000)
			setTimeout(() => this.dom.removeChild(toast), 5000)
		}

		/**
		 * 得到焦点
		 */
		public focus() {
			this.terminal.focus()
		}

		/**
		 * 失去焦点
		 */
		public blur() {
			this.terminal.blur()
		}
	}

	/**
	 * 配置tty
	 * @param opt 配置選項
	 */
	function config(opt: TTYConfigOption) {
		for (let i in opt) {
			(option as any)[i] = (opt as any)[i]
		}
	}

	/**
	 * 渲染tty
	 */
	function render() {
		//獲取web-tty-render
		let doms = document.querySelectorAll('[web-tty-render]')
		for (let i = 0; i < doms.length; i++) {
			let tty = new TTY(doms.item(i) as any)
			ttys.push(tty)
		}
		//構建socket
		socket = new Socket()
	}

	/**
	 * 設置dom樣式
	 * @param styles dom樣式
	 */
	function css(dom: HTMLElement, styles: Partial<CSSStyleDeclaration>) {
		for (let i in styles) {
			(dom.style as any)[i] = (styles as any)[i]
		}
	}

	/**
	 * 創建一個dom并設置樣式
	 */
	function elem<K extends keyof HTMLElementTagNameMap>(name: K, styles: Partial<CSSStyleDeclaration> = {}): HTMLElementTagNameMap[K] {
		let e = document.createElement(name)
		css(e, styles)
		return e
	}

	/**
	 * 通过名称获取tty
	 * @param name tty的名称
	 */
	function getByName(name: string) {
		if (!name) return null;
		let _ttys = ttys.filter(tty => tty.name == name)
		return _ttys[0] || null
	}

	//導出
	win.webpty = {
		config,
		render,
		getByName,
		get terminals() {
			return ttys
		}
	}

})(window as any);