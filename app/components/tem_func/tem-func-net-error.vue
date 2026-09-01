<template>
	<!-- ————————————————————无网默认页———————————————————— -->
	<!-- 原理：是通过监控api函数的内部是否得到执行，若执行，则给外部变量赋值传出网络状态。外部控制无网页显示的函数在api函数之外、之后，等待从api函数内传出的状态变量，若没有传出，则视为无网，显示无网页，若收到传出状态，则视为有网。
	问题：微信小程序js的api请求是异步的，外部待机函数等不到api执行完毕就会自己执行，解决办法：等等看是否收到值，未收到就判定为无网。
	注意：login页默认不显示wait页 -->
	<view class="tem_func_NE_face" v-if="tem_func_EN_state.waitNet">
		<view class="tem_func_NE_wait_box" v-if="!tem_func_EN_state.notNet">
			<!-- 加载界面，这个界面一定会首先得到显示，等待收到值之后才会hidden -->
			<image class="tem_func_NE_wait_img" src="/static/images/template/tem_func/loading.gif" />
		</view>
		<view class="tem_func_NE_not_box" v-if="tem_func_EN_state.notNet">
			<!-- 无网界面，这个界面是在等待一段时间后，确定是无网状态，才会显示 -->
			<image class="tem_func_NE_not_image" src="/static/images/template/tem_func/neterror.png" />
			<view class="tem_func_NE_not_title">无法连接到服务器</view>
			<text class="tem_func_NE_not_text">您可去首页的"林课社区"获取更多信息！</text>
		</view>
	</view>
</template>

<script>
export default {
	name: 'TemFuncNetError',
	props: {
		tem_func_EN_state: {
			type: Object,
			required: true
		}
	}
}
</script>

<style scoped>
/* ————————————————————无网默认页———————————————————— */

.tem_func_NE_face {
	position: relative;
	width: 750rpx;
	height: 100vh;
	display: flex;
	flex-direction: column;
	justify-content: space-around;
	background-color: #fff;
}

/* 加载界面 */
.tem_func_NE_wait_box {
	position: relative;
	width: 260rpx;
	height: 260rpx;
	left: 245rpx;
}

.tem_func_NE_wait_img {
	position: relative;
	width: 260rpx;
	height: 260rpx;
}

/* 无网界面 */
.tem_func_NE_not_box {
	position: relative;
	width: 650rpx;
	height: 470rpx;
	left: 50rpx;
}

.tem_func_NE_not_image {
	position: absolute;
	width: 76rpx;
	height: 90rpx;
}

.tem_func_NE_not_title {
	position: absolute;
	top: 150rpx;
	width: 650rpx;
	height: 100rpx;
	line-height: 100rpx;
	font-size: 42rpx;
	font-weight: 700;
	color: #242424;
}

.tem_func_NE_not_text {
	position: absolute;
	top: 270rpx;
	width: 650rpx;
	height: 200rpx;
	line-height: 40rpx;
	font-size: 30rpx;
	color: #242424;
}
</style>
