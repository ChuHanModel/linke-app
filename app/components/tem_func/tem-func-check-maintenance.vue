<template>
	<!-- ————————————————————维护提示页———————————————————— -->
	<view class="tem_func_CM_face" v-if="maintenanceInfo.state">
		<view class="tem_func_CM_box">
			<image class="tem_func_CM_image" src="/static/images/template/tem_func/neterror.png" />
			<view class="tem_func_CM_title">{{maintenanceInfo.title}}</view>
			<text class="tem_func_CM_info">{{maintenanceInfo.info}}{{maintenanceInfo.time}}</text>
		</view>
	</view>
</template>

<script>
export default {
	name: 'TemFuncCheckMaintenance',
	props: {
		maintenanceInfo: {
			type: Object,
			required: true
		}
	}
}
</script>

<style scoped>
/* ————————————————————维护提示页———————————————————— */
.tem_func_CM_face {
	position: relative;
	width: 750rpx;
	height: 100vh;
	display: flex;
	flex-direction: column;
	justify-content: space-around;
	background-color: #fff;
}

.tem_func_CM_box {
	position: relative;
	width: 650rpx;
	height: 470rpx;
	left: 50rpx;
}

.tem_func_CM_title {
	position: absolute;
	top: 150rpx;
	width: 650rpx;
	height: 100rpx;
	line-height: 100rpx;
	font-size: 42rpx;
	font-weight: 700;
	color: #242424;
}

.tem_func_CM_info {
	position: absolute;
	top: 270rpx;
	width: 650rpx;
	height: 200rpx;
	line-height: 40rpx;
	font-size: 30rpx;
	color: #242424;
}

.tem_func_CM_image {
	position: absolute;
	width: 76rpx;
	height: 90rpx;
}
</style>
