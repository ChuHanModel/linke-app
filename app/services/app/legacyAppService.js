import api from '@/utils/api.js'
import md5 from '@/utils/md5.js'
import { getDefaultTabPath } from '@/utils/defaultLaunchTab.js'

export const legacyAppMethods = {
	setInitialData(thatPage) {
		uni.setStorage({ key: 'app_tem_func_EN_state', data: this.globalData.app_tem_func_EN_state })
		uni.setStorage({ key: 'maintenanceInfo', data: this.globalData.maintenanceInfo })
		thatPage.setData({
			tem_func_EN_state: uni.getStorageSync('app_tem_func_EN_state'),
			maintenanceInfo: uni.getStorageSync('maintenanceInfo'),
		})
	},

	checkNetError_begin_repeated(thatPage) {
		if (thatPage.data.tem_func_EN_state.resIndex == null) {
			console.log('app多次无网检测-第一次成功执行')
			thatPage.setData({ ['tem_func_EN_state.waitNet']: false })
			thatPage.setData({ ['tem_func_EN_state.notNet']: false })
			thatPage.setData({ ['tem_func_EN_state.resIndex']: 1 })
			return
		}
		console.log('app多次无网检测-不是第一次成功执行')
		thatPage.setData({ ['tem_func_EN_state.resIndex']: thatPage.data.tem_func_EN_state.resIndex + 1 })
	},

	checkNetError_end_repeated(thatPage) {
		setTimeout(() => {
			if (thatPage.data.tem_func_EN_state.errIndex == null) {
				console.log('app多次无网检测-第一次被调用')
				thatPage.setData({ ['tem_func_EN_state.errIndex']: 1 })
			} else {
				console.log('app多次无网检测-不是第一次被调用')
				thatPage.setData({ ['tem_func_EN_state.errIndex']: thatPage.data.tem_func_EN_state.errIndex + 1 })
			}
			const hasNet = thatPage.data.tem_func_EN_state.resIndex === thatPage.data.tem_func_EN_state.errIndex
			console.log(`app多次无网检测-${hasNet ? '有网' : '无网'}`)
			thatPage.setData({
				['tem_func_EN_state.waitNet']: !hasNet,
				['tem_func_EN_state.notNet']: !hasNet
			})
		}, 2999)
	},

	checkNetError_over(thatPage) {
		thatPage.setData({
			['tem_func_EN_state.waitNet']: false,
			['tem_func_EN_state.notNet']: false
		})
	},

	login(thatPage, way) {
		let userId
		let userPassword
		let verifyCode
		switch (way) {
			case 'login':
				userId = thatPage.data.popInput_userId
				userPassword = thatPage.data.popInput_userPassword
				verifyCode = thatPage.data.popInput_verifyCode
				break
			case 'loginCode':
				userId = uni.getStorageSync('userId')
				userPassword = uni.getStorageSync('userPassword')
				verifyCode = thatPage.data.verifyCode
				break
			default:
				break
		}
		if (verifyCode == '') {
			uni.showToast({ title: '请输入验证码', icon: 'none' })
			return
		}
		api.post('App.User.Logins', { userId, userPassword, verifyCode }).then(res => {
			uni.showToast({ title: '成功', icon: 'success', duration: 2000 })
			this.globalData.userData.userKey = md5.hexMD5(userId + userPassword)
			if (way == 'login') {
				this.checkNetError_begin_repeated(thatPage)
				this.globalData.userData.userInfo = res
				uni.setStorage({ key: 'userId', data: thatPage.data.popInput_userId })
				uni.setStorage({ key: 'userPassword', data: thatPage.data.popInput_userPassword })
				uni.setStorage({ key: 'userKey', data: this.globalData.userData.userKey })
				uni.setStorage({ key: 'userInfo', data: this.globalData.userData.userInfo })
				uni.setStorage({ key: 'userOut', data: 'false' })
				console.log('登录成功，userOut本地存储已经设为false')
			} else {
				this.globalData.userData.userInfo = res
				uni.setStorage({ key: 'userInfo', data: this.globalData.userData.userInfo })
			}

			api.post('App.UserCourse.ReloadUserCourse', { userKey: this.globalData.userData.userKey }).catch(err => { console.log(err) })
			api.post('App.UserScore.ReloadUserScore', { userKey: this.globalData.userData.userKey }).catch(err => { console.log(err) })
			api.post('App.UserCredit.GetUserCredit', { userKey: this.globalData.userData.userKey }).then(res2 => {
				const userCredit = []
				const arrayAttribute = Object.getOwnPropertyNames(res2)
				const courseType = []
				arrayAttribute.forEach((key) => {
					if (key !== '总学分') courseType.push(key)
				})
				uni.setStorage({ key: 'courseType', data: courseType })

				let creditTotal = 0
				for (let index = 0; index < arrayAttribute.length; index++) {
					const typeName = arrayAttribute[index]
					const detail = res2[typeName].detail
					if (detail) {
						userCredit[index] = { type: typeName, course: [], credit: '' }
						const detailKeys = Object.getOwnPropertyNames(detail)
						let creditProcess = 0
						for (let i = 0; i < detailKeys.length; i++) {
							const courseName = detailKeys[i]
							const credit = detail[courseName]
							userCredit[index].course[i] = { courseName, credit }
							creditProcess = parseInt(creditProcess) + parseInt(credit)
							creditTotal = parseInt(creditTotal) + parseInt(credit)
						}
						userCredit[index].credit = creditProcess
					} else {
						userCredit[index] = { type: typeName, course: [], credit: '0' }
					}
				}
				const withCredit = userCredit.filter(item => item.credit != 0)
				const withoutCredit = userCredit.filter(item => item.credit == 0)
				uni.setStorage({ key: 'userCredit', data: withCredit.concat(withoutCredit) })
				uni.setStorage({ key: 'userCreditTotal', data: creditTotal })
			}).catch(err => { console.log(err) })

			const userSchedule = new Array()
			for (let index = 0; index < 25; index++) {
				api.post('App.UserSchedule.GetSchedule', { userKey: this.globalData.userData.userKey, week: index + 1 }).then(scheduleRes => {
					userSchedule[index + 1] = scheduleRes
					if (index == 24) {
						uni.setStorage({ key: 'userSchedule', data: userSchedule })
						this.globalData.userData.userSchedule = userSchedule
						uni.switchTab({ url: getDefaultTabPath() })
					}
				}).catch(() => {})
			}

		}).catch(err => {
			if (way === 'login') {
				this.checkNetError_begin_repeated(thatPage)
				uni.showModal({
					title: '登录错误',
					content: err,
					showCancel: false,
					confirmText: '确定',
					confirmColor: '#0074D4',
					complete() {
						thatPage.setData({
							ifHellowthatPageHidden: true,
							ifNumthatPageHidden: false,
							ifCodethatPageHidden: true,
							popInput_verifyCode: ''
						})
					}
				})
			} else if (way === 'loginCode') {
				uni.showModal({
					title: '刷新错误',
					content: err,
					showCancel: false,
					confirmText: '确定',
					confirmColor: '#0074D4',
					complete() {
						uni.showModal({
							title: '失败的可能原因',
							content: '若您更改过教务密码则需重新登录',
							showCancel: true,
							cancelText: '取消',
							cancelColor: '#242424',
							confirmText: '重新登录',
							confirmColor: '#0074D4',
							success(res2) {
								if (res2.confirm) {
									uni.setStorage({ key: 'userOut', data: 'true' })
									console.log('已重置userOut本地存储值为true')
									uni.clearStorageSync()
									uni.switchTab({ url: getDefaultTabPath() })
									return
								}
								uni.removeStorageSync('userCookie')
								uni.switchTab({ url: getDefaultTabPath() })
							}
						})
					}
				})
			}
		})
		if (way == 'login') {
			this.checkNetError_end_repeated(thatPage)
		}
	},

	getTimeStamp(time) {
		const timeArray = time.split('-')
		const timeLast = `${timeArray[0]}/${timeArray[1]}/${timeArray[2]} ${timeArray[3]}:${timeArray[4]}:${timeArray[5]}`
		return Date.parse(timeLast)
	},

	getNowTimeStamp() {
		return new Date().getTime()
	},

	getTime(type) {
		const timestamp = Date.parse(new Date())
		const date = new Date(timestamp)
		const Y = date.getFullYear()
		const M = date.getMonth() + 1 < 10 ? '0' + (date.getMonth() + 1) : date.getMonth() + 1
		const D = date.getDate() < 10 ? '0' + date.getDate() : date.getDate()
		let h = date.getHours()
		let m = date.getMinutes()
		const s = date.getSeconds()
		switch (type) {
			case 'Mm':
				return `${M}/${D} ${h}:${m}`
			case 'hm':
				if (parseInt(h) < 10) h = '0' + h
				if (parseInt(m) < 10) m = '0' + m
				return `${h}:${m}`
			case 'Ys':
				return `${Y}/${M}/${D} ${h}:${m}:${s}`
			default:
				return undefined
		}
	},

	creatSelectionState(beginTime, endTime) {
		const beginTimeTamp = this.getTimeStamp(beginTime)
		const endTimeTamp = this.getTimeStamp(endTime)
		const nowTimeStamp = this.getNowTimeStamp()
		return nowTimeStamp >= beginTimeTamp && nowTimeStamp <= endTimeTamp
	},

	exactDivision(arg1, arg2) {
		let t1 = 0
		let t2 = 0
		try { t1 = arg1.toString().split('.')[1].length } catch (e) {}
		try { t2 = arg2.toString().split('.')[1].length } catch (e) {}
		const r1 = Number(arg1.toString().replace('.', ''))
		const r2 = Number(arg2.toString().replace('.', ''))
		return (r1 / r2) * Math.pow(10, t2 - t1)
	},

	getTimeByTimeStamp(time, type) {
		const date = new Date(time)
		const Y = date.getFullYear()
		const M = date.getMonth() + 1
		const D = date.getDate()
		switch (type) {
			case 'MD':
				return `${M}/${D}`
			case 'YD':
				return `${Y}/${M}/${D}`
			default:
				return undefined
		}
	},

	timeToTime(time, type) {
		const timeArray = time.split('-')
		const M = timeArray[1]
		const D = timeArray[2]
		const h = timeArray[3]
		let m = timeArray[4]
		let s = timeArray[5]
		if (m < 10) m = '0' + m
		if (s < 10) s = '0' + s
		switch (type) {
			case 'Mm':
				return `${M}/${D} ${h}:${m}`
			default:
				return undefined
		}
	},

	getUniqueValue(res) {
		const resultRes = []
		for (let i = 0; i < res.length; i++) {
			if (i === 0) {
				resultRes[0] = res[0]
				continue
			}
			if (resultRes[resultRes.length - 1].courseId == res[i].courseId) {
				const oldTerm = resultRes[resultRes.length - 1].courseTerm.split('-')
				const newTerm = res[i].courseTerm.split('-')
				if (newTerm[0] > oldTerm[0] || (newTerm[0] == oldTerm[0] && newTerm[1] > oldTerm[1]) || (newTerm[0] == oldTerm[0] && newTerm[1] == oldTerm[1] && newTerm[2] > oldTerm[2])) {
					resultRes[resultRes.length - 1] = res[i]
				}
				continue
			}
			resultRes.push(res[i])
		}
		return resultRes
	}
}
