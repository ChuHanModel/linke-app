<template>
	<view class="itemBox">
		<!-- 上面的评分数字 -->
		<!-- 左边的星星 -->
		<view class="tem_fixed_starFace">
			<view class="tem_fixed_star_fixedStarFace">
				<view class="tem_fixed_star_starImgsBox">
					<image class="tem_fixed_star_starImg" src="/static/images/template/tem_fixed_star/star.png" />
					<image class="tem_fixed_star_starImg" src="/static/images/template/tem_fixed_star/star.png" />
					<image class="tem_fixed_star_starImg" src="/static/images/template/tem_fixed_star/star.png" />
					<image class="tem_fixed_star_starImg" src="/static/images/template/tem_fixed_star/star.png" />
					<image class="tem_fixed_star_starImg" src="/static/images/template/tem_fixed_star/star.png" />
				</view>
				<view class="tem_fixed_star_starImgsBox">
					<image class="tem_fixed_star_starImg" src="/static/images/template/tem_fixed_star/star.png" />
					<image class="tem_fixed_star_starImg" src="/static/images/template/tem_fixed_star/star.png" />
					<image class="tem_fixed_star_starImg" src="/static/images/template/tem_fixed_star/star.png" />
					<image class="tem_fixed_star_starImg" src="/static/images/template/tem_fixed_star/star.png" />
					<image class="tem_fixed_star_starImg" src="/static/images/template/tem_fixed_star/star0.png" />
				</view>
				<view class="tem_fixed_star_starImgsBox">
					<image class="tem_fixed_star_starImg" src="/static/images/template/tem_fixed_star/star.png" />
					<image class="tem_fixed_star_starImg" src="/static/images/template/tem_fixed_star/star.png" />
					<image class="tem_fixed_star_starImg" src="/static/images/template/tem_fixed_star/star.png" />
					<image class="tem_fixed_star_starImg" src="/static/images/template/tem_fixed_star/star0.png" />
					<image class="tem_fixed_star_starImg" src="/static/images/template/tem_fixed_star/star0.png" />
				</view>
				<view class="tem_fixed_star_starImgsBox">
					<image class="tem_fixed_star_starImg" src="/static/images/template/tem_fixed_star/star.png" />
					<image class="tem_fixed_star_starImg" src="/static/images/template/tem_fixed_star/star.png" />
					<image class="tem_fixed_star_starImg" src="/static/images/template/tem_fixed_star/star0.png" />
					<image class="tem_fixed_star_starImg" src="/static/images/template/tem_fixed_star/star0.png" />
					<image class="tem_fixed_star_starImg" src="/static/images/template/tem_fixed_star/star0.png" />
				</view>
				<view class="tem_fixed_star_starImgsBox">
					<image class="tem_fixed_star_starImg" src="/static/images/template/tem_fixed_star/star.png" />
					<image class="tem_fixed_star_starImg" src="/static/images/template/tem_fixed_star/star0.png" />
					<image class="tem_fixed_star_starImg" src="/static/images/template/tem_fixed_star/star0.png" />
					<image class="tem_fixed_star_starImg" src="/static/images/template/tem_fixed_star/star0.png" />
					<image class="tem_fixed_star_starImg" src="/static/images/template/tem_fixed_star/star0.png" />
				</view>
			</view>
		</view>
		<!-- 右边的进度条和数字 -->
		<view class="progressBox">
			<view v-for="(item, index) in progressWidth" :key="index" class="progressItem_box">
				<view class="progressItem_color" :style="'background-color:' + item.color + ';width:' + (item.width * 330) + 'rpx'"></view>
				<view class="progressItem_text">{{item.num}} 人</view>
			</view>
		</view>
	</view>
</template>

<script>
export default {
	name: 'TemInfoItem',
	props: {
		progressWidth: {
			type: Array,
			required: true
		}
	}
}
</script>

<style scoped>
.itemBox {
	position: relative;
	width: 650rpx;
	height: 280rpx;
}

/* 上面的评分数字 */

/* 评价主题色，与 themeScoreRating.THEME_RATING_COLOR 一致 */
.topNum {
	position: absolute;
	top: 37rpx;
	left: 145rpx;
	width: 80rpx;
	height: 30rpx;
	font-size: 30rpx;
	font-weight: 700;
	color: #ffc740;
	text-align: center;
	line-height: 30rpx;
}

/* 星星 */

.tem_fixed_starFace {
	position: absolute;
	left: 40rpx;
	top: 88rpx;
	width: 160rpx;
	height: 190rpx;
}

/* 进度条 */

.progressBox {
	position: absolute;
	right: 40rpx;
	top: 90rpx;
	display: flex;
	flex-direction: column;
	justify-content: space-around;
	width: 390rpx;
	height: 170rpx;
}

.progressItem_box {
	height: 15rpx;
	width: 390rpx;
	position: relative;
}

.progressItem_color {
	/* 全长330rpx */
	position: absolute;
	top: 2rpx;
	height: 11rpx;
	border-radius: 30rpx;
}

.progressItem_text {
	position: absolute;
	right: 0;
	height: 15rpx;
	width: 100rpx;
	font-size: 24rpx;
	line-height: 15rpx;
	text-align: right;
	color: #95959a;
}


/* 星星 */
.tem_fixed_star_fixedStarFace {
	position: relative;
	width: 140rpx;
	height: 170rpx;
	display: flex;
	flex-direction: column;
	justify-content: space-around;
}

.tem_fixed_star_starImgsBox {
	position: relative;
	display: flex;
	flex-direction: row;
	justify-content: space-around;
	width: 140rpx;
	height: 25rpx;
}

.tem_fixed_star_starImg {
	height: 25rpx;
	width: 25rpx;
}
</style>
