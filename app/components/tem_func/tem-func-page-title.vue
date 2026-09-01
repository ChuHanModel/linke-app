<template>
	<view class='tem_func_PT_box'>
		<view class='tem_func_PT_text'>{{tem_func_PT_textData.title}}</view>
		<view class="tem_func_PT_tip">{{tem_func_PT_textData.tip}}</view>
	</view>
</template>

<script>
export default {
	name: 'TemFuncPageTitle',
	props: {
		tem_func_PT_textData: {
			type: Object,
			required: true
		}
	}
}
</script>

<style scoped>
/* ————————————————————巨大标题———————————————————— */

.tem_func_PT_box {
	width: 750rpx;
	height: 400rpx;
	position: relative;
}

.tem_func_PT_text {
	position: absolute;
	left: 25rpx;
	top: 75rpx;
	height: 250rpx;
	width: 700rpx;
	text-align: center;
	line-height: 250rpx;
	font-size: 56rpx;
	letter-spacing: 3rpx;
}

.tem_func_PT_tip {
	position: absolute;
	top: 248rpx;
	height: 50rpx;
	width: 750rpx;
	text-align: center;
	line-height: 50rpx;
	font-size: 28rpx;
	color: #3c3c3c;
	letter-spacing: 1rpx;
}
</style>
