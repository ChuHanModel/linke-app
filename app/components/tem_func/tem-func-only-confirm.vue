<template>
	<!-- ————————————————————底部确定按钮———————————————————— -->
	<view class="tem_func_OC_face">
		<view class="tem_func_OC_item" hover-class="hover_tem_func_OC_item" @tap="handleConfirm">
			确定
		</view>
	</view>
</template>

<script>
export default {
	name: 'TemFuncOnlyConfirm',
	methods: {
		handleConfirm() {
			this.$emit('confirm')
		}
	}
}
</script>

<style scoped>
/* ————————————————————底部确定按钮———————————————————— */
.tem_func_OC_face {
	width: 750rpx;
	height: 80rpx;
	position: fixed;
	bottom: 20rpx;
	display: flex;
	justify-content: center;
	align-items: center;
	margin-bottom: 20rpx;
}

.tem_func_OC_item {
	width: 650rpx;
	height: 80rpx;
	text-align: center;
	line-height: 80rpx;
	font-size: 36rpx;
	border-radius: 50rpx;
	color: #010101;
	font-weight: 700;
}

.hover_tem_func_OC_item {
	background-color: #e9e9e9
}
</style>
