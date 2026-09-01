<template>
	<view class="tem_lesson_face">
		<view v-for="(item, index) in allLessonInfo" :key="index">
			<view class="tem_lesson_top_block"></view>
			<view class='tem_lesson_item_face' :data-course='item.courseId' :data-term='item.courseTerm' @tap='goInfo' :id="index">
				<!-- 实际显示的盒子 -->
				<view class='tem_lesson_item_box' :style="'right:' + item.right + 'rpx'">
					<!-- 官方信息 -->
					<view class='tem_lesson_item_name'>{{item.lessonName}}-{{item.teacherName}}</view>
					<!-- 评论个数 -->
					<view class="tem_lesson_item_num">
						{{item.courseCollection}}收藏·{{item.courseComment}}评论
					</view>
					<!-- 评分进度条 -->
					<view class="tem_lesson_item_num_high" id="tem_lesson_item_num_high_star" :style="'left:' + (((item.courseStar-4)/1)*468+108) + 'rpx'" v-if="item.courseStar>=4.1">
						{{item.courseStar}}
					</view>
					<view class="tem_lesson_item_num_down" id="tem_lesson_item_num_down_star" style="left:108rpx" v-if="item.courseStar<4.1">
						{{item.courseStar}}
					</view>
					<view class="tem_lesson_item_title" id="tem_lesson_item_title_star">评分</view>
					<view class="tem_lesson_item_color" id="tem_lesson_item_color_star" :style="'width:' + (((item.courseStar-4)/1)*468) + 'rpx'"></view>
					<view class="tem_lesson_item_background" id="tem_lesson_item_background_star"></view>
					<!-- 成绩进度条 -->
					<view class="tem_lesson_item_num_high" id="tem_lesson_item_num_high_grade" :style="'left:' + (((item.courseScore-80)/20)*468+108) + 'rpx'" v-if="item.courseScore>=80.1">
						{{item.courseScore}}
					</view>
					<view class="tem_lesson_item_num_down" id="tem_lesson_item_num_down_grade" style="left:108rpx" v-if="item.courseScore<80.1">
						{{item.courseScore}}
					</view>
					<view class="tem_lesson_item_title" id="tem_lesson_item_title_grade">成绩</view>
					<view class="tem_lesson_item_color" id="tem_lesson_item_color_grade" :style="'width:' + (((item.courseScore-80)/20)*468) + 'rpx'"></view>
					<view class="tem_lesson_item_background" id="tem_lesson_item_background_grade"></view>
				</view>
			</view>
		</view>
	</view>
	<view class="tem_lesson_block"></view>
</template>

<script>
export default {
	name: 'TemLesson',
	props: {
		allLessonInfo: {
			type: Array,
			required: true
		}
	},
	methods: {
		goInfo(e) {
			const dataset = e.currentTarget.dataset
			this.$emit('goInfo', {
				courseId: dataset.course,
				courseTerm: dataset.term,
				index: e.currentTarget.id
			})
		}
	}
}
</script>

<style scoped>
/* ————————————————————block&line———————————————————— */
.tem_lesson_top_block {
	position: relative;
	height: 0rpx;
}

.tem_lesson_block {
	position: relative;
	height: 50rpx;
}

/* ————————————————————face———————————————————— */
.tem_lesson_face {
	position: relative;
	left: 50rpx;
	width: 650rpx;
	border-radius: 30rpx;
	background-color: #fff;
}

.tem_lesson_item_face {
	position: relative;
	width: 650rpx;
	height: 260rpx;
	display: flex;
	flex-direction: row;
}

.tem_lesson_item_box {
	position: relative;
	width: 650rpx;
	height: 260rpx;
	border-radius: 20rpx;
}

/* ————————————————————数量———————————————————— */

.tem_lesson_item_num {
	position: absolute;
	bottom: 20rpx;
	right: 50rpx;
	width: 200rpx;
	height: 36rpx;
	color: #9c9c9c;
	font-size: 22rpx;
	font-weight: 500;
	text-align: right;
	line-height: 36rpx;
	border-radius: 20rpx;
	letter-spacing: 0.8rpx;
}

/* ————————————————————name———————————————————— */

.tem_lesson_item_name {
	position: absolute;
	top: 38rpx;
	left: 50rpx;
	width: 600rpx;
	height: 34rpx;
	color: #242424;
	font-size: 30rpx;
	letter-spacing: 0.8rpx;
	font-weight: 520;
	line-height: 40rpx;
}

/* ————————————————————成绩&评分进度条：综合样式———————————————————— */

/* 进度条上面的数字，高分 */
.tem_lesson_item_num_high {
	position: absolute;
	width: 80rpx;
	height: 24rpx;
	font-size: 24rpx;
	font-weight: 550;
}

/* 进度条上面的数字，低分 */
.tem_lesson_item_num_down {
	position: absolute;
	width: 80rpx;
	height: 24rpx;
	color: #949494;
	font-size: 24rpx;
	font-weight: 550;
}

/* 进度条左边的标题 */
.tem_lesson_item_title {
	position: absolute;
	left: 50rpx;
	width: 200rpx;
	height: 22rpx;
	color: #949494;
	font-size: 24rpx;
	font-weight: 500;
	letter-spacing: 0.8rpx;
}

/* 彩色进度条 */
.tem_lesson_item_color {
	position: absolute;
	left: 130rpx;
	width: 0rpx;
	height: 10rpx;
	border-radius: 50rpx;
	z-index: 99;
}

/* 进度条背景 */
.tem_lesson_item_background {
	position: absolute;
	left: 130rpx;
	width: 468rpx;
	height: 10rpx;
	background-color: #f0efef;
	border-radius: 50rpx;
}

/* ————————————————————成绩&评分进度条：评分进度条位置及颜色———————————————————— */

#tem_lesson_item_num_high_star {
	top: 88rpx;
	color: #FAB50c;
}

#tem_lesson_item_num_down_star {
	top: 88rpx;
}

/* 进度条左边标题 */
#tem_lesson_item_title_star {
	top: 105.7rpx;
}

/* 彩色进度条 */

#tem_lesson_item_color_star {
	top: 119rpx;
	background: linear-gradient(90deg, #f7eed9, #FAB50c);
}

#tem_lesson_item_background_star {
	top: 119rpx;
}

/* ————————————————————成绩&评分进度条：成绩进度条位置及颜色———————————————————— */

#tem_lesson_item_num_high_grade {
	top: 137rpx;
	color: #4197FE;
}

#tem_lesson_item_num_down_grade {
	top: 136.5rpx;
}

/* 进度条左边标题 */
#tem_lesson_item_title_grade {
	top: 155.5rpx;
}

/* 彩色进度条 */
#tem_lesson_item_color_grade {
	top: 169rpx;
	background: linear-gradient(90deg, #e9eff5, #4197FE);
}

#tem_lesson_item_background_grade {
	top: 169rpx;
}
</style>
