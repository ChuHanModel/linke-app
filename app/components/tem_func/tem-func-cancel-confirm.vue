<template>
	<!-- ————————————————————底部取消&确定按钮———————————————————— -->
	<view class='tem_func_CC_face'>
		<view class='tem_func_CC_box'>
			<view class='tem_func_CC_item' hover-class="hover_tem_func_CC_item" @tap="handleCancel">
				取消
			</view>
			<view class='tem_func_CC_item' hover-class="hover_tem_func_CC_item" @tap='handleConfirm'>
				确定
			</view>
		</view>
	</view>
</template>

<script>
export default {
	name: 'TemFuncCancelConfirm',
	methods: {
		handleCancel() {
			this.$emit('cancel')
		},
		handleConfirm() {
			this.$emit('confirm')
		}
	}
}
</script>

<style scoped>
/* ————————————————————底部取消&确定按钮———————————————————— */
/* 页面最下方固定的按钮的face，组件四周居中 */
.tem_func_CC_face {
	width: 750rpx;
	height: 80rpx;
	position: fixed;
	bottom: 20rpx;
	display: flex;
	justify-content: center;
	align-items: center;
	margin-bottom: 20rpx;
}

.tem_func_CC_box {
	width: 720rpx;
	height: 80rpx;
	display: flex;
	flex-direction: row;
	justify-content: space-around;
}

.tem_func_CC_item {
	width: 300rpx;
	height: 80rpx;
	text-align: center;
	line-height: 80rpx;
	font-size: 36rpx;
	border-radius: 50rpx;
	color: #010101;
	font-weight: 700;
}

.hover_tem_func_CC_item {
	background-color: #e9e9e9
}
</style>
