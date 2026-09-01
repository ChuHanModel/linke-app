<template>
  <div
    class="desktop-shell"
    :class="{
      'show-jw-shell-controls': showJwShellControls,
      'jw-navigation-collapsed': showJwShellControls && jwNavigationCollapsed,
      'has-jw-agent-panel': showJwAgentPanel
    }"
  >
    <header class="desktop-titlebar">
      <button
        v-if="showJwShellControls"
        type="button"
        class="titlebar-shell-button titlebar-nav-toggle"
        :class="{ active: !jwNavigationCollapsed }"
        :aria-pressed="!jwNavigationCollapsed"
        :aria-label="jwNavigationCollapsed ? '展开导航目录' : '折叠导航目录'"
        :title="jwNavigationCollapsed ? '展开导航目录' : '折叠导航目录'"
        @click="toggleJwNavigationPanel"
      >
        <svg viewBox="0 0 24 24" aria-hidden="true" focusable="false">
          <path d="M4.5 5.5h15v13h-15z" />
          <path d="M9 5.5v13" />
          <path d="M6.2 9h.1" />
          <path d="M6.2 12h.1" />
          <path d="M6.2 15h.1" />
        </svg>
      </button>
      <nav v-if="featureItems.length > 1" class="titlebar-tabs" role="tablist" aria-label="林课功能">
        <button
          v-for="feature in featureItems"
          :key="feature.key"
          type="button"
          class="titlebar-tab"
          :class="{ active: activeFeature === feature.key }"
          role="tab"
          :aria-selected="activeFeature === feature.key"
          @click="setActiveFeature(feature.key)"
        >
          <span class="titlebar-tab-label">{{ feature.label }}</span>
        </button>
      </nav>
      <button
        v-if="showJwShellControls"
        type="button"
        class="titlebar-shell-button titlebar-agent-toggle"
        :class="{ active: jwAgentPanelOpen }"
        :aria-pressed="jwAgentPanelOpen"
        :aria-label="jwAgentPanelOpen ? '折叠 Agent 面板' : '展开 Agent 面板'"
        :title="jwAgentPanelOpen ? '折叠 Agent 面板' : '展开 Agent 面板'"
        @click="toggleJwAgentPanel"
      >
        <svg viewBox="0 0 24 24" aria-hidden="true" focusable="false">
          <path d="M4.5 5.5h15v13h-15z" />
          <path d="M15 5.5v13" />
          <path d="M17.4 9h.1" />
          <path d="M17.4 12h.1" />
          <path d="M17.4 15h.1" />
        </svg>
      </button>
    </header>

    <div class="desktop-body">
      <main
        class="workspace"
        :class="[
          `${activeFeature}-workspace`,
          {
            'has-jw-navigation': showJwNavigation,
            'jw-navigation-collapsed': showJwShellControls && jwNavigationCollapsed,
            'has-jw-agent-panel': showJwAgentPanel
          }
        ]"
      >
      <template v-if="activeFeature === 'browser'">
        <Transition name="jw-side-panel-left">
          <section
            v-if="showJwNavigationPanel"
            class="jw-navigation-panel"
            aria-label="教务导航"
            @pointerdown.capture="clearClientTextSelection"
          >
          <div class="jw-navigation-list">
            <div class="jw-navigation-catalog" aria-label="教务目录">
              <div class="jw-navigation-actions" aria-label="导航目录操作">
                <button
                  type="button"
                  class="jw-navigation-action-button"
                  aria-label="全部展开"
                  data-tooltip="展开全部目录"
                  title="全部展开"
                  @click="setAllJwNavigationFoldersExpanded(true)"
                >
                  <svg viewBox="0 0 24 24" aria-hidden="true" focusable="false">
                    <path d="M5 7h14" />
                    <path d="M7 11h10" />
                    <path d="M8 15l4 4 4-4" />
                  </svg>
                </button>
                <button
                  type="button"
                  class="jw-navigation-action-button"
                  aria-label="全部折叠"
                  data-tooltip="折叠全部目录"
                  title="全部折叠"
                  @click="setAllJwNavigationFoldersExpanded(false)"
                >
                  <svg viewBox="0 0 24 24" aria-hidden="true" focusable="false">
                    <path d="M5 17h14" />
                    <path d="M7 13h10" />
                    <path d="M8 9l4-4 4 4" />
                  </svg>
                </button>
              </div>
              <template
                v-for="section in renderedJwCatalogSections"
                :key="section.key"
              >
                <div
                  v-if="section.kind === 'item'"
                  class="jw-navigation-row jw-navigation-top-entry level-0"
                  :class="{
                    active: activeNavigationItemId === section.item.id,
                    disabled: isJwNavigationItemDisabled(section, section.item, 0),
                    home: section.item.id === personalCenterNavigationItem.id
                  }"
                >
                  <button
                    type="button"
                    class="jw-navigation-item"
                    :disabled="isJwNavigationItemDisabled(section, section.item, 0)"
                    @click="openJwNavigationItem(section, section.item, 0)"
                  >
                    <span class="jw-navigation-item-marker" aria-hidden="true">
                      <svg viewBox="0 0 24 24" focusable="false">
                        <path d="M4 10.5 12 4l8 6.5" />
                        <path d="M6.5 10v9h11v-9" />
                        <path d="M10 19v-5h4v5" />
                      </svg>
                    </span>
                    <span class="jw-navigation-item-label">
                      <span class="jw-navigation-item-title">{{ section.item.title }}</span>
                    </span>
                  </button>
                </div>
                <details
                  v-if="section.kind === 'item'"
                  class="jw-navigation-favorite-group"
                  :class="{
                    empty: isFavoriteNavigationEmpty,
                    'empty-expanded': emptyFavoriteNavigationExpanded
                  }"
                  :open="isFavoriteNavigationEmpty ? false : undefined"
                >
                  <summary @click="toggleEmptyFavoriteNavigation">
                    <span class="jw-navigation-group-toggle" aria-hidden="true"></span>
                    <span class="jw-navigation-group-icon" aria-hidden="true">
                      <svg viewBox="0 0 24 24" focusable="false">
                        <path
                          v-for="path in getJwNavigationGroupIconPaths(favoriteNavigationSection)"
                          :key="path"
                          :d="path"
                        />
                      </svg>
                    </span>
                    <span class="jw-navigation-group-title">{{ favoriteNavigationSection.title }}</span>
                  </summary>
                  <div
                    v-for="(item, itemIndex) in favoriteNavigationSection.items"
                    :key="item.id"
                    class="jw-navigation-row favorite level-0"
                    :class="{
                      active: activeNavigationItemId === item.id,
                      disabled: isJwNavigationItemDisabled(favoriteNavigationSection, item, itemIndex)
                    }"
                  >
                    <button
                      type="button"
                      class="jw-navigation-item"
                      :disabled="isJwNavigationItemDisabled(favoriteNavigationSection, item, itemIndex)"
                      @click="openJwNavigationItem(favoriteNavigationSection, item, itemIndex)"
                    >
                      <span class="jw-navigation-item-marker" aria-hidden="true"></span>
                      <span class="jw-navigation-item-label">
                        <span class="jw-navigation-item-title">{{ item.title }}</span>
                      </span>
                    </button>
                    <button
                      v-if="isJwNavigationItemFavoriteable(favoriteNavigationSection, item, itemIndex)"
                      type="button"
                      class="jw-navigation-favorite"
                      :class="{ active: isJwNavigationItemFavorite(item) }"
                      :aria-pressed="isJwNavigationItemFavorite(item)"
                      :title="isJwNavigationItemFavorite(item) ? '取消收藏' : '收藏导航'"
                      @click.stop="toggleJwNavigationFavorite(favoriteNavigationSection, item, itemIndex)"
                    >
                      <svg viewBox="0 0 24 24" aria-hidden="true" focusable="false">
                        <polygon points="12 3 14.78 8.63 21 9.54 16.5 13.93 17.56 20.12 12 17.2 6.44 20.12 7.5 13.93 3 9.54 9.22 8.63 12 3" />
                      </svg>
                    </button>
                  </div>
                </details>
                <details
                  v-if="section.kind !== 'item'"
                  class="jw-navigation-group"
                >
                  <summary>
                    <span class="jw-navigation-group-toggle" aria-hidden="true"></span>
                    <span class="jw-navigation-group-icon" aria-hidden="true">
                      <svg viewBox="0 0 24 24" focusable="false">
                        <path
                          v-for="path in getJwNavigationGroupIconPaths(section)"
                          :key="path"
                          :d="path"
                        />
                      </svg>
                    </span>
                    <span class="jw-navigation-group-title">{{ section.title }}</span>
                  </summary>
                  <template
                    v-for="node in section.visibleTree"
                    :key="node.item.id"
                  >
                    <details
                      v-if="node.children.length > 0"
                      class="jw-navigation-subgroup"
                    >
                      <summary>
                        <span class="jw-navigation-subgroup-toggle" aria-hidden="true"></span>
                        <span class="jw-navigation-subgroup-title">{{ node.item.title }}</span>
                      </summary>
                      <div class="jw-navigation-subgroup-items">
                        <div
                          v-for="child in getNavigationNodeDescendants(node)"
                          :key="child.item.id"
                          class="jw-navigation-row subitem"
                          :class="[
                            `level-${getNavigationItemLevel(child.item)}`,
                            {
                              active: activeNavigationItemId === child.item.id,
                              disabled: isJwNavigationItemDisabled(section, child.item, child.itemIndex),
                              branch: hasJwNavigationChildItem(section, child.item, child.itemIndex),
                              favorite: child.item.source === 'favorite'
                            }
                          ]"
                        >
                          <button
                            type="button"
                            class="jw-navigation-item"
                            :disabled="isJwNavigationItemDisabled(section, child.item, child.itemIndex)"
                            @click="openJwNavigationItem(section, child.item, child.itemIndex)"
                          >
                            <span class="jw-navigation-item-marker" aria-hidden="true"></span>
                            <span class="jw-navigation-item-label">
                              <span class="jw-navigation-item-title">{{ child.item.title }}</span>
                              <span
                                v-if="getNavigationItemContext(child.item)"
                                class="jw-navigation-item-context"
                              >
                                {{ getNavigationItemContext(child.item) }}
                              </span>
                            </span>
                          </button>
                          <button
                            v-if="isJwNavigationItemFavoriteable(section, child.item, child.itemIndex)"
                            type="button"
                            class="jw-navigation-favorite"
                            :class="{ active: isJwNavigationItemFavorite(child.item) }"
                            :aria-pressed="isJwNavigationItemFavorite(child.item)"
                            :title="isJwNavigationItemFavorite(child.item) ? '取消收藏' : '收藏导航'"
                            @click.stop="toggleJwNavigationFavorite(section, child.item, child.itemIndex)"
                          >
                            <svg viewBox="0 0 24 24" aria-hidden="true" focusable="false">
                              <polygon points="12 3 14.78 8.63 21 9.54 16.5 13.93 17.56 20.12 12 17.2 6.44 20.12 7.5 13.93 3 9.54 9.22 8.63 12 3" />
                            </svg>
                          </button>
                        </div>
                      </div>
                    </details>
                    <div
                      v-else
                      class="jw-navigation-row"
                      :class="[
                        `level-${getNavigationItemLevel(node.item)}`,
                        {
                          active: activeNavigationItemId === node.item.id,
                          disabled: isJwNavigationItemDisabled(section, node.item, node.itemIndex),
                          branch: hasJwNavigationChildItem(section, node.item, node.itemIndex),
                          favorite: node.item.source === 'favorite'
                        }
                      ]"
                    >
                      <button
                        type="button"
                        class="jw-navigation-item"
                        :disabled="isJwNavigationItemDisabled(section, node.item, node.itemIndex)"
                        @click="openJwNavigationItem(section, node.item, node.itemIndex)"
                      >
                        <span class="jw-navigation-item-marker" aria-hidden="true"></span>
                        <span class="jw-navigation-item-label">
                          <span class="jw-navigation-item-title">{{ node.item.title }}</span>
                          <span
                            v-if="getNavigationItemContext(node.item)"
                            class="jw-navigation-item-context"
                          >
                            {{ getNavigationItemContext(node.item) }}
                          </span>
                        </span>
                      </button>
                      <button
                        v-if="isJwNavigationItemFavoriteable(section, node.item, node.itemIndex)"
                        type="button"
                        class="jw-navigation-favorite"
                        :class="{ active: isJwNavigationItemFavorite(node.item) }"
                        :aria-pressed="isJwNavigationItemFavorite(node.item)"
                        :title="isJwNavigationItemFavorite(node.item) ? '取消收藏' : '收藏导航'"
                        @click.stop="toggleJwNavigationFavorite(section, node.item, node.itemIndex)"
                      >
                        <svg viewBox="0 0 24 24" aria-hidden="true" focusable="false">
                          <polygon points="12 3 14.78 8.63 21 9.54 16.5 13.93 17.56 20.12 12 17.2 6.44 20.12 7.5 13.93 3 9.54 9.22 8.63 12 3" />
                        </svg>
                      </button>
                    </div>
                  </template>
                  <div v-if="section.items.length === 0" class="jw-navigation-empty">
                    {{ section.emptyText || '暂无导航' }}
                  </div>
                </details>
              </template>
            </div>
          </div>
          <div class="jw-navigation-footer" aria-label="教务系统操作">
            <button type="button" class="jw-navigation-footer-button" @click="showOriginalJwPage">
              显示原始网页
            </button>
            <button
              type="button"
              class="jw-navigation-footer-button"
              :class="{ active: jwNavigationSettingsOpen }"
              aria-haspopup="menu"
              :aria-expanded="jwNavigationSettingsOpen"
              @click="toggleJwNavigationSettings"
            >
              设置
            </button>
          </div>
          </section>
        </Transition>
        <button
          v-if="showJwNavigationSettingsPanel"
          type="button"
          class="jw-navigation-settings-scrim"
          aria-label="关闭设置菜单"
          @click="closeJwNavigationSettings"
        ></button>
        <Transition name="jw-settings-popover">
          <section
            v-if="showJwNavigationSettingsPanel"
            class="jw-navigation-settings-popover"
            role="menu"
            aria-label="教务设置"
            @keydown.esc.stop="closeJwNavigationSettings"
          >
            <button type="button" class="jw-navigation-settings-item danger" role="menuitem" @click="logoutJw">
              <span>退出登录</span>
            </button>
          </section>
        </Transition>
        <section v-if="showJwPageHeader" class="jw-page-header" aria-label="当前教务页面">
          <nav class="jw-page-breadcrumb" aria-label="当前教务路径">
            <span
              v-for="(crumb, crumbIndex) in currentJwPageBreadcrumb"
              :key="`${crumb}-${crumbIndex}`"
              class="jw-page-crumb"
              :class="{ current: crumbIndex === currentJwPageBreadcrumb.length - 1 }"
            >
              {{ crumb }}
            </span>
          </nav>
        </section>
        <Transition name="jw-side-panel-right">
          <aside v-if="showJwAgentPanel" class="jw-agent-panel" aria-label="林课助手">
            <header v-if="false" class="jw-agent-header">
              <button
                v-if="linkeAssistantView !== 'home'"
                type="button"
                class="linke-assistant-back"
                title="返回"
                aria-label="返回"
                @click="goBackLinkeAssistant"
              >
                ‹
              </button>
              <div class="jw-agent-title-group">
                <span v-if="linkeAssistantKicker" class="jw-agent-kicker">{{ linkeAssistantKicker }}</span>
                <strong>{{ linkeAssistantTitle }}</strong>
              </div>
            </header>
            <div class="jw-agent-thread linke-assistant-thread">
              <template v-if="linkeAssistantView === 'home'">
                <section class="linke-mobile-header">
                  <div class="linke-mobile-title">林课助手</div>
                  <div class="linke-mobile-subtitle">在教务系统旁边处理评价与课程查询。</div>
                </section>
                <div class="linke-home-grid">
                  <button type="button" class="linke-entry-card" @click="openLinkeMyCourses">
                    <span class="linke-entry-eyebrow">我的课程</span>
                    <strong>{{ linkeMyCoursesEntryTitle }}</strong>
                    <span>{{ linkeMyCoursesSummaryText }}</span>
                  </button>
                  <button type="button" class="linke-entry-card" @click="openLinkeCollections">
                    <span class="linke-entry-eyebrow">我的收藏课程</span>
                    <strong>{{ linkeCollectionEntryTitle }}</strong>
                    <span>{{ linkeCollectionSummaryText }}</span>
                  </button>
                  <button type="button" class="linke-entry-card" @click="openLinkeWorkbench">
                    <span class="linke-entry-eyebrow">评价工作台</span>
                    <strong>{{ jwEvaluationPendingCountText }}</strong>
                    <span>{{ jwEvaluationSummaryText }}</span>
                  </button>
                  <button type="button" class="linke-entry-card" @click="openLinkeDatabase">
                    <span class="linke-entry-eyebrow">林课数据库</span>
                    <strong>搜索课程</strong>
                    <span>按课程名或教师名查询课程。</span>
                  </button>
                </div>
              </template>

              <template v-else-if="linkeAssistantView === 'collections'">
                <section class="linke-mobile-header">
                  <div class="linke-header-title-row">
                    <button type="button" class="linke-page-back" title="返回" @click="goBackLinkeAssistant">
                      <span class="linke-page-back-arrow"></span>
                    </button>
                    <div class="linke-mobile-title">我的收藏课程</div>
                  </div>
                  <div class="linke-mobile-subtitle">{{ linkeCollectionSubtitle }}</div>
                </section>
                <div class="linke-mobile-content">
                  <div v-if="linkeCollectionLoading" class="linke-skeleton-list">
                    <div v-for="idx in 3" :key="`collection-skeleton-${idx}`" class="linke-skeleton-card">
                      <div class="linke-skeleton-top">
                        <div class="linke-skeleton-left">
                          <span class="linke-skeleton-line title"></span>
                          <span class="linke-skeleton-line subtitle"></span>
                        </div>
                      </div>
                      <span class="linke-skeleton-line rating"></span>
                      <span class="linke-skeleton-chart"></span>
                    </div>
                  </div>
                  <div v-else-if="linkeCollectionState.status === 'error'" class="linke-state-card error">
                    {{ linkeCollectionState.message || '收藏课程读取失败' }}
                  </div>
                  <div v-else-if="linkeCollectionCourses.length === 0" class="linke-module-state">
                    <span>☆</span>
                    <strong>暂无收藏课程</strong>
                    <p>在课程详情页收藏后，会在这里集中查看。</p>
                  </div>
                  <div v-else class="linke-card-stack">
                    <button
                      v-for="course in linkeCollectionCourses"
                      :key="`collection-${getCourseId(course)}`"
                      type="button"
                      class="linke-course-card"
                      @click="openLinkeCourseDetail(course, { fromEvaluation: course.hasEvaluationPermission === true })"
                    >
                      <span class="linke-course-top">
                        <span class="linke-card-row1-text">
                          <strong>{{ getCourseTitle(course) }}</strong>
                          <span>{{ getCourseTeacher(course) }}</span>
                        </span>
                        <span class="linke-card-bookmark">
                          <i></i>
                        </span>
                      </span>
                      <span class="linke-course-meta">
                        <span v-if="getDisplayCourseType(course)" class="linke-course-type-tag">{{ getDisplayCourseType(course) }}</span>
                        <span v-if="getCourseRatingText(course)" class="linke-rating-text">{{ getCourseRatingText(course) }}</span>
                        <span v-else class="linke-no-rating">暂无评分</span>
                      </span>
                      <span v-if="hasScoreBoxplot(course)" class="linke-card-boxplot">
                        <span class="linke-card-boxplot-axis"></span>
                        <span class="linke-card-boxplot-whisker" :style="getScoreLeftWhiskerStyle(course)"></span>
                        <span class="linke-card-boxplot-whisker" :style="getScoreRightWhiskerStyle(course)"></span>
                        <span class="linke-card-boxplot-box" :style="getScoreBoxplotBoxStyle(course)"></span>
                        <span class="linke-card-boxplot-median" :style="getScoreMedianStyle(course)"></span>
                        <span class="linke-card-boxplot-endpoint" :style="getScoreEndpointStyle(course, 'minScore')"></span>
                        <span class="linke-card-boxplot-endpoint" :style="getScoreEndpointStyle(course, 'maxScore')"></span>
                        <span class="linke-card-boxplot-quartile" :style="getScoreQuartileLabelStyle(course, 'q1Score')">{{ formatScoreValue(course.scoreStats?.q1Score) }}</span>
                        <span class="linke-card-boxplot-quartile" :style="getScoreQuartileLabelStyle(course, 'q3Score')">{{ formatScoreValue(course.scoreStats?.q3Score) }}</span>
                        <span class="linke-card-boxplot-value" :style="getScoreDataValueStyle(course, 'minScore')">{{ formatScoreValue(course.scoreStats?.minScore) }}</span>
                        <span class="linke-card-boxplot-value" :style="getScoreDataValueStyle(course, 'maxScore')">{{ formatScoreValue(course.scoreStats?.maxScore) }}</span>
                      </span>
                      <span v-else class="linke-card-no-score">暂无成绩分布数据</span>
                    </button>
                  </div>
                </div>
              </template>

              <template v-else-if="linkeAssistantView === 'myCourses'">
                <section class="linke-mobile-header">
                  <div class="linke-header-title-row">
                    <button type="button" class="linke-page-back" title="返回" @click="goBackLinkeAssistant">
                      <span class="linke-page-back-arrow"></span>
                    </button>
                    <div class="linke-mobile-title">我的课程</div>
                  </div>
                  <div class="linke-mobile-subtitle">{{ linkeMyCoursesSubtitle }}</div>
                  <nav class="linke-tab-bar" aria-label="我的课程筛选">
                    <button
                      v-for="item in linkeMyCoursesTabs"
                      :key="item.value"
                      type="button"
                      class="linke-tab-item"
                      :class="{ active: linkeMyCoursesTab === item.value }"
                      @click="linkeMyCoursesTab = item.value"
                    >
                      {{ item.label }}
                    </button>
                  </nav>
                </section>
                <div class="linke-mobile-content">
                  <div v-if="linkeMyCoursesLoading" class="linke-sync-loading">
                    <div class="linke-sync-progress-card">
                      <div class="linke-sync-progress-head">
                        <strong>{{ linkeMyCoursesProgressMessage }}</strong>
                        <span>{{ linkeMyCoursesProgressPercent }}%</span>
                      </div>
                      <div class="linke-sync-progress-track">
                        <i :style="{ width: `${linkeMyCoursesProgressPercent}%` }"></i>
                      </div>
                      <p>{{ linkeMyCoursesProgressDetail }}</p>
                    </div>
                    <div class="linke-skeleton-list">
                      <div v-for="idx in 3" :key="`my-courses-skeleton-${idx}`" class="linke-skeleton-card">
                        <div class="linke-skeleton-top">
                          <div class="linke-skeleton-left">
                            <span class="linke-skeleton-line title"></span>
                            <span class="linke-skeleton-line tag"></span>
                          </div>
                          <span class="linke-skeleton-status"></span>
                        </div>
                        <span class="linke-skeleton-line rating"></span>
                        <span class="linke-skeleton-chart"></span>
                      </div>
                    </div>
                  </div>
                  <div v-else-if="linkeMyCoursesState.status === 'error'" class="linke-state-card error">
                    {{ linkeMyCoursesState.message || '我的课程读取失败' }}
                  </div>
                  <div v-else-if="!linkeMyCoursesReady" class="linke-module-state">
                    <span>⌁</span>
                    <strong>登录后可查看我的课程</strong>
                    <p>请先完成教务系统登录，登录成功后将自动读取选课日志并标记成绩状态。</p>
                  </div>
                  <div v-else-if="linkeMyCoursesVisibleCourses.length === 0" class="linke-module-state">
                    <span>◌</span>
                    <strong>{{ linkeMyCoursesEmptyText }}</strong>
                    <p>{{ linkeMyCoursesEmptyDescription }}</p>
                  </div>
                  <div v-else class="linke-term-groups">
                    <section
                      v-for="group in linkeMyCoursesVisibleGroups"
                      :key="`my-course-term-${group.term}`"
                      class="linke-term-group"
                    >
                      <div class="linke-term-header">
                        <strong>{{ group.term }}</strong>
                        <span>{{ group.courses.length }} 门</span>
                      </div>
                      <div class="linke-card-stack">
                        <button
                          v-for="course in group.courses"
                          :key="`my-course-${getCourseId(course)}-${course.term || ''}`"
                          type="button"
                          class="linke-course-card"
                          @click="openLinkeCourseDetail(course, { fromEvaluation: course.hasEvaluationPermission === true, forceReadOnly: course.hasEvaluationPermission !== true })"
                        >
                          <span class="linke-course-top">
                            <span class="linke-card-row1-text">
                              <strong>{{ getCourseTitle(course) }}</strong>
                              <span>{{ getCourseTeacher(course) }}</span>
                            </span>
                            <span class="linke-grade-state-pill" :class="getCourseGradeStateClass(course)">
                              {{ getCourseGradeStatusText(course) }}
                            </span>
                          </span>
                          <span class="linke-course-meta">
                            <span v-if="getDisplayCourseType(course)" class="linke-course-type-tag">{{ getDisplayCourseType(course) }}</span>
                            <span v-if="getCourseRatingText(course)" class="linke-rating-text">{{ getCourseRatingText(course) }}</span>
                            <span v-else class="linke-no-rating">暂无评分</span>
                          </span>
                          <span v-if="hasScoreBoxplot(course)" class="linke-card-boxplot">
                            <span class="linke-card-boxplot-axis"></span>
                            <span class="linke-card-boxplot-whisker" :style="getScoreLeftWhiskerStyle(course)"></span>
                            <span class="linke-card-boxplot-whisker" :style="getScoreRightWhiskerStyle(course)"></span>
                            <span class="linke-card-boxplot-box" :style="getScoreBoxplotBoxStyle(course)"></span>
                            <span class="linke-card-boxplot-median" :style="getScoreMedianStyle(course)"></span>
                            <span class="linke-card-boxplot-endpoint" :style="getScoreEndpointStyle(course, 'minScore')"></span>
                            <span class="linke-card-boxplot-endpoint" :style="getScoreEndpointStyle(course, 'maxScore')"></span>
                            <span class="linke-card-boxplot-quartile" :style="getScoreQuartileLabelStyle(course, 'q1Score')">{{ formatScoreValue(course.scoreStats?.q1Score) }}</span>
                            <span class="linke-card-boxplot-quartile" :style="getScoreQuartileLabelStyle(course, 'q3Score')">{{ formatScoreValue(course.scoreStats?.q3Score) }}</span>
                            <span class="linke-card-boxplot-value" :style="getScoreDataValueStyle(course, 'minScore')">{{ formatScoreValue(course.scoreStats?.minScore) }}</span>
                            <span class="linke-card-boxplot-value" :style="getScoreDataValueStyle(course, 'maxScore')">{{ formatScoreValue(course.scoreStats?.maxScore) }}</span>
                          </span>
                          <span v-else class="linke-card-no-score">暂无成绩分布数据</span>
                        </button>
                      </div>
                    </section>
                  </div>
                </div>
              </template>

              <template v-else-if="linkeAssistantView === 'workbench'">
                <section class="linke-mobile-header">
                  <div class="linke-header-title-row">
                    <button type="button" class="linke-page-back" title="返回" @click="goBackLinkeAssistant">
                      <span class="linke-page-back-arrow"></span>
                    </button>
                    <div class="linke-mobile-title">评价工作台</div>
                    <div class="linke-header-actions">
                      <button
                        type="button"
                        class="linke-header-text-button"
                        :disabled="jwEvaluationLoading"
                        title="从教务系统重新同步课程"
                        @click="syncJwEvaluationCourses"
                      >
                        教务同步
                      </button>
                      <button
                        type="button"
                        class="linke-header-icon-button"
                        :disabled="jwEvaluationLoading"
                        title="刷新已评价状态"
                        aria-label="刷新已评价状态"
                        @click="refreshJwEvaluationCourses"
                      >
                        ↻
                      </button>
                    </div>
                  </div>
                  <div class="linke-mobile-subtitle">{{ linkeWorkbenchSubtitle }}</div>
                  <nav class="linke-tab-bar" aria-label="评价课程筛选">
                    <button
                      v-for="item in linkeWorkbenchTabs"
                      :key="item.value"
                      type="button"
                      class="linke-tab-item"
                      :class="{ active: linkeWorkbenchTab === item.value }"
                      @click="linkeWorkbenchTab = item.value"
                    >
                      {{ item.label }}
                    </button>
                  </nav>
                </section>
                <div class="linke-mobile-content">
                  <div v-if="jwEvaluationLoading" class="linke-skeleton-list">
                    <div v-for="idx in 3" :key="`workbench-skeleton-${idx}`" class="linke-skeleton-card">
                      <div class="linke-skeleton-top">
                        <div class="linke-skeleton-left">
                          <span class="linke-skeleton-line title"></span>
                          <span class="linke-skeleton-line tag"></span>
                        </div>
                        <span class="linke-skeleton-status"></span>
                      </div>
                      <span class="linke-skeleton-line rating"></span>
                      <span class="linke-skeleton-chart"></span>
                    </div>
                  </div>
                  <div v-else-if="jwEvaluationState.status === 'error'" class="linke-state-card error">
                    {{ jwEvaluationState.message || '待评价课程读取失败' }}
                  </div>
                  <div v-else-if="!jwEvaluationStatusReady" class="linke-module-state">
                    <span>⌁</span>
                    <strong>首次同步后可查看待评价课程</strong>
                    <p>首次会读取教务课程；后续刷新只更新已评价状态。</p>
                  </div>
                  <div v-else-if="!jwEvaluationState.evaluationStatusKnown" class="linke-state-card warning">
                    已读取 {{ jwEvaluationState.totalCount || 0 }} 门课程候选，但暂未拿到已评价状态。
                  </div>
                  <div v-else-if="linkeWorkbenchVisibleCourses.length === 0" class="linke-module-state">
                    <span>◌</span>
                    <strong>{{ linkeWorkbenchEmptyText }}</strong>
                    <p>{{ linkeWorkbenchEmptyDescription }}</p>
                  </div>
                  <div v-else class="linke-card-stack">
                    <button
                      v-for="course in linkeWorkbenchVisibleCourses"
                      :key="`workbench-${getCourseId(course)}-${course.term || ''}`"
                      type="button"
                      class="linke-course-card"
                      @click="openLinkeCourseDetail(course, { fromEvaluation: true })"
                      @contextmenu.prevent="openLinkeEvaluatedActions(course)"
                    >
                      <span class="linke-course-top">
                        <span class="linke-card-row1-text">
                          <strong>{{ getCourseTitle(course) }}</strong>
                          <span>{{ getCourseTeacher(course) }}</span>
                        </span>
                        <span v-if="isLinkeCourseCollected(course)" class="linke-card-bookmark">
                          <i></i>
                        </span>
                      </span>
                      <span class="linke-course-meta">
                        <span v-if="getDisplayCourseType(course)" class="linke-course-type-tag">{{ getDisplayCourseType(course) }}</span>
                        <span v-if="getCourseRatingText(course)" class="linke-rating-text">{{ getCourseRatingText(course) }}</span>
                        <span v-else class="linke-no-rating">暂无评分</span>
                      </span>
                      <span v-if="hasScoreBoxplot(course)" class="linke-card-boxplot">
                        <span class="linke-card-boxplot-axis"></span>
                        <span class="linke-card-boxplot-whisker" :style="getScoreLeftWhiskerStyle(course)"></span>
                        <span class="linke-card-boxplot-whisker" :style="getScoreRightWhiskerStyle(course)"></span>
                        <span class="linke-card-boxplot-box" :style="getScoreBoxplotBoxStyle(course)"></span>
                        <span class="linke-card-boxplot-median" :style="getScoreMedianStyle(course)"></span>
                        <span class="linke-card-boxplot-endpoint" :style="getScoreEndpointStyle(course, 'minScore')"></span>
                        <span class="linke-card-boxplot-endpoint" :style="getScoreEndpointStyle(course, 'maxScore')"></span>
                        <span class="linke-card-boxplot-quartile" :style="getScoreQuartileLabelStyle(course, 'q1Score')">{{ formatScoreValue(course.scoreStats?.q1Score) }}</span>
                        <span class="linke-card-boxplot-quartile" :style="getScoreQuartileLabelStyle(course, 'q3Score')">{{ formatScoreValue(course.scoreStats?.q3Score) }}</span>
                        <span class="linke-card-boxplot-value" :style="getScoreDataValueStyle(course, 'minScore')">{{ formatScoreValue(course.scoreStats?.minScore) }}</span>
                        <span class="linke-card-boxplot-value" :style="getScoreDataValueStyle(course, 'maxScore')">{{ formatScoreValue(course.scoreStats?.maxScore) }}</span>
                      </span>
                      <span v-else class="linke-card-no-score">暂无成绩分布数据</span>
                    </button>
                  </div>
                </div>
              </template>

              <template v-else-if="linkeAssistantView === 'database'">
                <section class="linke-mobile-header">
                  <div class="linke-header-title-row">
                    <button type="button" class="linke-page-back" title="返回" @click="goBackLinkeAssistant">
                      <span class="linke-page-back-arrow"></span>
                    </button>
                    <div class="linke-mobile-title">林课数据库</div>
                  </div>
                  <div class="linke-mobile-subtitle">按课程名或教师名搜索课程。</div>
                  <form class="linke-search-bar" @submit.prevent="searchLinkeCourses">
                    <div class="linke-search-field" :class="{ focus: linkeCourseSearchFocused }">
                      <input
                        v-model="linkeCourseSearchKeyword"
                        class="linke-search-input"
                        placeholder="课程名 / 教师名"
                        spellcheck="false"
                        @focus="linkeCourseSearchFocused = true"
                        @blur="linkeCourseSearchFocused = false"
                      />
                      <button
                        v-if="linkeCourseSearchKeyword"
                        type="button"
                        class="linke-search-clear"
                        title="清空"
                        @click="clearLinkeSearchKeyword"
                      >
                        ✕
                      </button>
                    </div>
                    <button type="submit" class="linke-search-action" :disabled="linkeCourseSearchLoading || !linkeCourseSearchKeyword.trim()">
                      {{ linkeCourseSearchLoading ? '搜索中…' : '搜索' }}
                    </button>
                  </form>
                </section>
                <div class="linke-mobile-content">
                  <div v-if="linkeCourseSearchState.status === 'idle' && linkeSearchRecentKeywords.length > 0 && !linkeCourseSearchLoading" class="linke-recent-section">
                    <div class="linke-recent-head">
                      <span>最近搜索</span>
                      <button type="button" @click="clearLinkeRecentKeywords">清空</button>
                    </div>
                    <div class="linke-recent-list">
                      <button
                        v-for="item in linkeSearchRecentKeywords"
                        :key="item"
                        type="button"
                        class="linke-recent-chip"
                        @click="useLinkeRecentKeyword(item)"
                      >
                        {{ item }}
                      </button>
                    </div>
                  </div>
                  <div v-if="linkeCourseSearchLoading" class="linke-skeleton-list">
                    <div v-for="idx in 3" :key="`search-skeleton-${idx}`" class="linke-skeleton-card">
                      <div class="linke-skeleton-top">
                        <div class="linke-skeleton-left">
                          <span class="linke-skeleton-line title"></span>
                          <span class="linke-skeleton-line subtitle"></span>
                        </div>
                      </div>
                      <div class="linke-skeleton-chip-row">
                        <span class="linke-skeleton-chip"></span>
                        <span class="linke-skeleton-chip"></span>
                      </div>
                      <span class="linke-skeleton-chart"></span>
                    </div>
                  </div>
                  <div v-else-if="linkeCourseSearchState.status === 'error'" class="linke-state-card error">
                    {{ linkeCourseSearchState.message || '搜索失败' }}
                  </div>
                  <div v-else-if="linkeCourseSearchState.status === 'ready' && linkeCourseSearchResults.length === 0" class="linke-module-state">
                    <span>⌕</span>
                    <strong>没找到相关课程</strong>
                    <p>换一个课程名、教师名，或者缩短关键词试试看。</p>
                    <em>比如直接搜老师姓名，往往比搜完整课程名更容易命中。</em>
                  </div>
                  <div v-else-if="linkeCourseSearchResults.length > 0" class="linke-card-stack">
                    <div class="linke-section-note">“{{ linkeCourseSearchState.keyword }}” 共找到 {{ linkeCourseSearchResults.length }} 门相关课程</div>
                    <button
                      v-for="course in linkeCourseSearchResults"
                      :key="`search-${getCourseId(course)}`"
                      type="button"
                      class="linke-course-card"
                      @click="openLinkeCourseDetail(course, { fromEvaluation: false })"
                    >
                      <span class="linke-course-top">
                        <span class="linke-card-row1-text">
                          <strong>{{ getCourseTitle(course) }}</strong>
                          <span>{{ getCourseTeacher(course) }}</span>
                        </span>
                        <span v-if="isLinkeCourseCollected(course)" class="linke-card-bookmark">
                          <i></i>
                        </span>
                      </span>
                      <span class="linke-course-meta">
                        <span v-if="getDisplayCourseType(course)" class="linke-course-type-tag">{{ getDisplayCourseType(course) }}</span>
                        <span v-if="getCourseRatingText(course)" class="linke-rating-text">{{ getCourseRatingText(course) }}</span>
                        <span v-else class="linke-no-rating">暂无评分</span>
                      </span>
                      <span v-if="hasScoreBoxplot(course)" class="linke-card-boxplot">
                        <span class="linke-card-boxplot-axis"></span>
                        <span class="linke-card-boxplot-whisker" :style="getScoreLeftWhiskerStyle(course)"></span>
                        <span class="linke-card-boxplot-whisker" :style="getScoreRightWhiskerStyle(course)"></span>
                        <span class="linke-card-boxplot-box" :style="getScoreBoxplotBoxStyle(course)"></span>
                        <span class="linke-card-boxplot-median" :style="getScoreMedianStyle(course)"></span>
                        <span class="linke-card-boxplot-endpoint" :style="getScoreEndpointStyle(course, 'minScore')"></span>
                        <span class="linke-card-boxplot-endpoint" :style="getScoreEndpointStyle(course, 'maxScore')"></span>
                        <span class="linke-card-boxplot-quartile" :style="getScoreQuartileLabelStyle(course, 'q1Score')">{{ formatScoreValue(course.scoreStats?.q1Score) }}</span>
                        <span class="linke-card-boxplot-quartile" :style="getScoreQuartileLabelStyle(course, 'q3Score')">{{ formatScoreValue(course.scoreStats?.q3Score) }}</span>
                        <span class="linke-card-boxplot-value" :style="getScoreDataValueStyle(course, 'minScore')">{{ formatScoreValue(course.scoreStats?.minScore) }}</span>
                        <span class="linke-card-boxplot-value" :style="getScoreDataValueStyle(course, 'maxScore')">{{ formatScoreValue(course.scoreStats?.maxScore) }}</span>
                      </span>
                      <span v-else class="linke-card-no-score">暂无成绩分布数据</span>
                    </button>
                  </div>
                </div>
              </template>

              <template v-else-if="linkeAssistantView === 'detail'">
                <div v-if="linkeCourseDetailState.status === 'loading'" class="linke-detail-skeleton">
                  <section class="linke-mobile-header">
                    <div class="linke-header-title-row">
                      <button type="button" class="linke-page-back" title="返回" @click="goBackLinkeAssistant">
                        <span class="linke-page-back-arrow"></span>
                      </button>
                      <span class="linke-skeleton-line title"></span>
                    </div>
                    <span class="linke-skeleton-line subtitle"></span>
                  </section>
                  <div class="linke-mobile-content">
                    <div class="linke-skeleton-section">
                      <span class="linke-skeleton-line title"></span>
                      <div class="linke-skeleton-card compact">
                        <span v-for="idx in 6" :key="`detail-fact-${idx}`" class="linke-skeleton-line fact"></span>
                      </div>
                    </div>
                    <div class="linke-skeleton-section">
                      <span class="linke-skeleton-line title"></span>
                      <div class="linke-skeleton-card">
                        <span class="linke-skeleton-chart tall"></span>
                        <div class="linke-skeleton-chip-row">
                          <span class="linke-skeleton-chip"></span>
                          <span class="linke-skeleton-chip"></span>
                          <span class="linke-skeleton-chip"></span>
                        </div>
                      </div>
                    </div>
                    <div class="linke-skeleton-section">
                      <span class="linke-skeleton-line title"></span>
                      <div class="linke-skeleton-card">
                        <span class="linke-skeleton-line rating"></span>
                        <span class="linke-skeleton-line subtitle"></span>
                        <span class="linke-skeleton-line subtitle short"></span>
                      </div>
                    </div>
                  </div>
                </div>
                <div v-else-if="linkeCourseDetailState.status === 'error'" class="linke-state-card error">
                  {{ linkeCourseDetailState.message || '课程详情读取失败' }}
                </div>
                <div v-else-if="linkeDetailCourse" class="linke-detail-page">
                  <section class="linke-mobile-header">
                    <div class="linke-header-title-row">
                      <button type="button" class="linke-page-back" title="返回" @click="goBackLinkeAssistant">
                        <span class="linke-page-back-arrow"></span>
                      </button>
                      <div class="linke-mobile-title">{{ getCourseTitle(linkeDetailCourse) }}</div>
                    </div>
                    <div class="linke-detail-subline">
                      <span>{{ getCourseTeacher(linkeDetailCourse) }}</span>
                      <span class="linke-status-pill" :class="{ done: linkeDetailCourse.isEvaluated, view: !linkeDetailCourse.hasEvaluationPermission }">
                        {{ !linkeDetailCourse.hasEvaluationPermission ? '仅浏览' : (linkeDetailCourse.isEvaluated ? '已评价' : '待评价') }}
                      </span>
                    </div>
                  </section>
                  <div class="linke-mobile-content">
                    <div v-if="linkeCourseDetailState.message" class="linke-state-card warning">
                      {{ linkeCourseDetailState.message }}
                    </div>
                    <section class="linke-section">
                      <div class="linke-section-head">
                        <h3>基本信息</h3>
                        <div v-if="linkeCourseDetailState.availableTerms.length > 0" class="linke-term-filter-left">
                          <button
                            type="button"
                            class="linke-term-filter-main"
                            :disabled="linkeCourseDetailState.availableTerms.length <= 1"
                            @click="linkeDetailTermMenuOpen = !linkeDetailTermMenuOpen"
                          >
                            <span>学期</span>
                            <strong>{{ linkeCourseDetailState.selectedTerm || linkeCourseDetailState.availableTerms[0] }}</strong>
                            <em v-if="linkeCourseDetailState.availableTerms.length > 1" :class="{ open: linkeDetailTermMenuOpen }">▾</em>
                          </button>
                          <div v-if="linkeDetailTermMenuOpen && linkeCourseDetailState.availableTerms.length > 1" class="linke-term-filter-dropdown">
                            <button
                              v-for="term in linkeCourseDetailState.availableTerms"
                              :key="term"
                              type="button"
                              :class="{ active: linkeCourseDetailState.selectedTerm === term }"
                              @click="selectLinkeDetailTerm(term)"
                            >
                              {{ term }}
                            </button>
                          </div>
                        </div>
                      </div>
                      <div class="linke-fact-card">
                        <div><span>校区</span><strong>{{ linkeDetailCourse.lessonCampus || '—' }}</strong></div>
                        <div><span>学院</span><strong>{{ linkeDetailCourse.lessonCollege || '—' }}</strong></div>
                        <div><span>学分</span><strong>{{ linkeDetailCourse.lessonCredit || linkeDetailCourse.credit || '—' }}</strong></div>
                        <div><span>周次</span><strong>{{ linkeDetailCourse.lessonWeek || '—' }}</strong></div>
                        <div><span>时间</span><strong>{{ linkeDetailCourse.lessonTime || '—' }}</strong></div>
                        <div><span>地点</span><strong>{{ linkeDetailCourse.lessonLocation || '—' }}</strong></div>
                      </div>
                    </section>
                    <template v-if="linkeDetailShowScoreCommentBlock">
                    <section class="linke-section">
                      <div class="linke-section-head">
                        <h3>成绩分布</h3>
                        <span>{{ getScoreCountText(linkeCourseDetailState.scoreStats) }}</span>
                      </div>
                      <div class="linke-chart-card">
                        <div v-if="getScoreDistributionBars(linkeCourseDetailState.scoreStats).length" class="linke-score-chart-shell">
                          <div class="linke-score-grid">
                            <div
                              v-for="tick in getScoreOrdinate(linkeCourseDetailState.scoreStats)"
                              :key="`tick-${tick}`"
                              class="linke-score-grid-line"
                              :class="{ zero: tick === 0 }"
                              :style="{ top: `${getScoreTickTop(tick, linkeCourseDetailState.scoreStats)}%` }"
                            >
                              <span class="linke-score-grid-label">{{ tick }}人</span>
                              <span class="linke-score-grid-stroke"></span>
                            </div>
                          </div>
                          <div class="linke-score-columns">
                            <template
                              v-for="bar in getScoreDistributionBars(linkeCourseDetailState.scoreStats)"
                              :key="bar.range"
                            >
                              <span
                                v-if="bar.count > 0"
                                class="linke-score-column-ratio"
                                :style="{ left: bar.left, bottom: bar.ratioBottom }"
                              >
                                {{ bar.ratio }}
                              </span>
                              <span
                                v-if="bar.count > 0"
                                class="linke-score-column-bar"
                                :title="`${bar.range}: ${bar.count}`"
                                :style="{ left: bar.left, height: bar.height }"
                              ></span>
                              <span class="linke-score-column-label" :style="{ left: bar.left }">{{ bar.label }}</span>
                            </template>
                          </div>
                        </div>
                        <div v-else class="linke-muted-line">暂无成绩分布数据</div>
                        <div v-if="Number(linkeCourseDetailState.scoreStats?.count || 0) > 0" class="linke-score-summary">
                          <div>
                            <span>分数范围</span>
                            <strong>{{ getScoreRangeText(linkeCourseDetailState.scoreStats) }}</strong>
                          </div>
                          <div>
                            <span>平均分</span>
                            <strong>{{ getScoreAverageText(linkeCourseDetailState.scoreStats) }}</strong>
                          </div>
                          <div>
                            <span>中位数</span>
                            <strong>{{ getScoreMedianText(linkeCourseDetailState.scoreStats) }}</strong>
                          </div>
                        </div>
                      </div>
                    </section>
                    <section class="linke-section">
                      <div class="linke-section-head">
                        <h3>评分与评价</h3>
                        <span>{{ linkeDetailCommentCountText }}</span>
                      </div>
                      <div class="linke-rating-card">
                        <div v-if="linkeDetailHasRatingSummary" class="linke-rating-overall">
                          <strong>{{ formatRating(linkeCourseDetailState.rating?.starAvgTotal) }}</strong>
                          <span>综合评分</span>
                        </div>
                        <div v-if="linkeDetailHasRatingSummary" class="linke-rating-bars">
                          <div><span>内容价值</span><i :style="{ width: `${getRatingBarWidth(linkeCourseDetailState.rating?.starAvg1)}%` }"></i><em>{{ formatRating(linkeCourseDetailState.rating?.starAvg1) }}</em></div>
                          <div><span>管理轻松度</span><i :style="{ width: `${getRatingBarWidth(linkeCourseDetailState.rating?.starAvg2)}%` }"></i><em>{{ formatRating(linkeCourseDetailState.rating?.starAvg2) }}</em></div>
                          <div><span>良师指数</span><i :style="{ width: `${getRatingBarWidth(linkeCourseDetailState.rating?.starAvg3)}%` }"></i><em>{{ formatRating(linkeCourseDetailState.rating?.starAvg3) }}</em></div>
                        </div>
                        <div v-if="linkeCourseDetailState.comments.length > 0" class="linke-review-toolbar">
                          <div class="linke-comment-filter-left">
                            <button
                              type="button"
                              class="linke-comment-filter-main"
                              @click="linkeDetailFilterMenuOpen = !linkeDetailFilterMenuOpen"
                            >
                              <span>{{ getCommentFilterText(linkeDetailCommentFilter) }}</span>
                              <em :class="{ open: linkeDetailFilterMenuOpen }">▾</em>
                            </button>
                            <div v-if="linkeDetailFilterMenuOpen" class="linke-comment-filter-dropdown">
                              <button
                                v-for="item in linkeDetailCommentFilterOptions"
                                :key="item.value"
                                type="button"
                                :class="{ active: linkeDetailCommentFilter === item.value }"
                                @click="selectLinkeCommentFilter(item.value)"
                              >
                                {{ getCommentFilterText(item.value) }}
                              </button>
                            </div>
                          </div>
                          <div class="linke-sort-row">
                            <button
                              v-for="item in linkeDetailCommentSortOptions"
                              :key="item.value"
                              type="button"
                              :class="{ active: linkeDetailCommentSort === item.value }"
                              @click="linkeDetailCommentSort = item.value"
                            >
                              {{ item.label }}
                            </button>
                          </div>
                        </div>
                        <div v-if="linkeCourseDetailState.comments.length === 0" class="linke-review-empty">
                          <strong>暂无评价</strong>
                          <span v-if="linkeDetailCourse.hasEvaluationPermission && !linkeDetailCourse.isEvaluated">成为第一个评价的人吧</span>
                        </div>
                        <div v-else-if="linkeDetailSortedComments.length === 0" class="linke-review-empty">
                          <strong>暂无该分数段评论</strong>
                        </div>
                        <div v-else class="linke-review-list">
                          <article
                            v-for="(comment, index) in linkeDetailSortedComments"
                            :key="comment.commentId || index"
                            class="linke-review-card"
                          >
                            <div class="linke-review-head">
                              <div class="linke-review-user">
                                <span class="linke-review-avatar" :class="{ muted: !isHighComment(comment) }">匿</span>
                                <div>
                                  <strong>{{ getCommentDisplayName(comment) }}</strong>
                                  <div class="linke-review-meta">
                                    <span class="linke-review-stars">{{ getCommentStars(comment) }}</span>
                                    <span class="linke-score-badge" :class="{ success: isHighComment(comment), muted: !hasCommentScore(comment) }">{{ getCommentScoreBadge(comment) }}</span>
                                  </div>
                                </div>
                              </div>
                              <em>{{ formatCommentDate(comment.commentTime) }}</em>
                            </div>
                            <p>{{ comment.commentMessage || '该评价暂无文字内容' }}</p>
                            <button
                              v-if="linkeDetailCourse.hasEvaluationPermission"
                              type="button"
                              class="linke-review-like"
                              :class="{ active: comment.hasLiked }"
                              @click.stop="likeLinkeComment(comment)"
                            >
                              <span>{{ comment.hasLiked ? '♥' : '♡' }}</span>
                              <em v-if="Number(comment.likeCount || 0) > 0">{{ comment.likeCount }}</em>
                            </button>
                          </article>
                        </div>
                        <button
                          v-if="linkeCourseDetailState.commentHasMore"
                          type="button"
                          class="linke-view-all-button"
                          :disabled="linkeCourseDetailState.commentLoadingMore"
                          @click="loadMoreLinkeComments"
                        >
                          {{ linkeCourseDetailState.commentLoadingMore ? '加载中...' : '查看全部评价' }}
                        </button>
                      </div>
                    </section>
                    </template>
                    <div v-else class="linke-state-card compact">暂无成绩分布与评价数据</div>
                  </div>
                  <div class="linke-bottom-actions">
                    <button
                      type="button"
                      class="linke-secondary-button"
                      :class="{ active: linkeDetailIsCollected }"
                      :disabled="linkeDetailCollectionLoading"
                      @click="toggleLinkeCourseCollection(linkeDetailCourse)"
                    >
                      {{ linkeDetailCollectionLoading ? '处理中...' : (linkeDetailIsCollected ? '已收藏' : '收藏') }}
                    </button>
                    <button
                      type="button"
                      class="linke-primary-button"
                      :disabled="!linkeDetailCourse.hasEvaluationPermission || linkeDetailCourse.isEvaluated"
                      @click="openLinkeReview(linkeDetailCourse)"
                    >
                      {{ !linkeDetailCourse.hasEvaluationPermission ? '无评价权限' : (linkeDetailCourse.isEvaluated ? '已评价' : '去评价') }}
                    </button>
                  </div>
                </div>
              </template>

              <template v-else-if="linkeAssistantView === 'review'">
                <section class="linke-mobile-header">
                  <div class="linke-header-title-row">
                    <button type="button" class="linke-page-back" title="返回" @click="goBackLinkeAssistant">
                      <span class="linke-page-back-arrow"></span>
                    </button>
                    <div class="linke-mobile-title">{{ linkeReviewMode === 'edit' ? '修改评价' : '课程评价' }}</div>
                    <span class="linke-header-badge">{{ linkeReviewMode === 'edit' ? '编辑模式' : '匿名提交' }}</span>
                  </div>
                  <div class="linke-mobile-subtitle">{{ linkeReviewMode === 'edit' ? '你可以随时修正已提交的评分与文字评价。' : '匿名提交，仅作选课参考。' }}</div>
                </section>
                <div class="linke-mobile-content">
                  <div class="linke-current-course">
                    <div>
                      <strong>{{ getCourseTitle(linkeReviewCourse) }}</strong>
                      <span>{{ getCourseTeacher(linkeReviewCourse) }}</span>
                    </div>
                    <em>当前课程</em>
                  </div>
                  <div class="linke-review-section-title">从三个维度评价</div>
                  <div
                    v-for="dimension in linkeReviewDimensions"
                    :key="dimension.key"
                    class="linke-dimension-card"
                  >
                    <div class="linke-dimension-header">
                      <i></i>
                      <strong>{{ dimension.title }}</strong>
                    </div>
                    <span>{{ dimension.hint }}</span>
                    <div class="linke-star-row">
                      <button
                        v-for="n in 5"
                        :key="`${dimension.key}-${n}`"
                        type="button"
                        :class="{ active: linkeReviewForm[dimension.key] >= n }"
                        @click="linkeReviewForm[dimension.key] = n"
                      >
                        ★
                      </button>
                      <em v-if="linkeReviewForm[dimension.key] > 0">{{ getStarLabel(linkeReviewForm[dimension.key]) }}</em>
                    </div>
                  </div>
                  <div class="linke-review-section-title">文字评价</div>
                  <div class="linke-comment-card">
                    <textarea
                      v-model="linkeReviewForm.commentMessage"
                      maxlength="255"
                      placeholder="说说你的真实感受，帮后来人做选课参考"
                    ></textarea>
                    <span>{{ linkeReviewForm.commentMessage.length }}/255</span>
                  </div>
                  <div v-if="linkeReviewState.message" class="linke-state-card" :class="{ error: linkeReviewState.status === 'error' }">
                    {{ linkeReviewState.message }}
                  </div>
                  <div class="linke-submit-spacer"></div>
                  <div class="linke-submit-bar">
                    <div v-if="!linkeReviewFormReady" class="linke-submit-hint">{{ linkeReviewHintText }}</div>
                    <button
                      type="button"
                      class="linke-submit-button"
                      :disabled="!linkeReviewFormReady || linkeReviewSubmitting"
                      @click="submitLinkeReview"
                    >
                      {{ linkeReviewSubmitting ? '提交中...' : (linkeReviewMode === 'edit' ? '保存修改' : '提交评价') }}
                    </button>
                  </div>
                </div>
              </template>
              <div v-if="linkeEvaluatedActionCourse" class="linke-action-sheet-mask" @click="closeLinkeEvaluatedActions">
                <div class="linke-action-sheet" @click.stop>
                  <button type="button" @click="editLinkeEvaluatedCourse">修改</button>
                  <button type="button" class="danger" :disabled="linkeDeleteActionLoading" @click="deleteLinkeEvaluatedCourse">
                    {{ linkeDeleteActionLoading ? '删除中...' : '删除' }}
                  </button>
                  <button type="button" class="cancel" @click="closeLinkeEvaluatedActions">取消</button>
                </div>
              </div>
            </div>
          </aside>
        </Transition>
        <div class="browser-slot">
          <span>{{ webFeaturePlaceholder }}</span>
        </div>
      </template>
      </main>
    </div>
  </div>
</template>

<script setup>
import { computed, onMounted, onUnmounted, ref, watch } from 'vue'

const desktop = window.linkeDesktop
const defaultState = {
  url: 'http://jw.sdufe.edu.cn/',
  title: '',
  canGoBack: false,
  canGoForward: false,
  loading: false,
  tabs: [],
  activeTabId: '',
  activeFeature: 'browser',
  jwOriginalMode: false,
  jwPageTitle: '',
  jwPageGroupTitle: '',
  jwPageParentTitle: '',
  jwPageBreadcrumb: []
}

const browserState = ref({ ...defaultState })
const jwNavigationCatalog = ref({ groups: [] })
const jwNavigationFavorites = ref({ items: [] })
const activeNavigationItemId = ref('')
const captchaStatus = ref({ status: 'idle', message: '等待登录页' })
const credentialStatus = ref({ status: 'idle', message: '等待登录页' })
const jwNavigationCollapsed = ref(window.localStorage.getItem('linke.jwNavigationCollapsed') === '1')
const jwAgentPanelOpen = ref(window.localStorage.getItem('linke.jwAgentPanelOpen') !== '0')
const jwNavigationSettingsOpen = ref(false)
function createInitialJwEvaluationState() {
  return {
    status: 'idle',
    message: '',
    termList: [],
    courses: [],
    pending: [],
    evaluated: [],
    totalCount: 0,
    pendingCount: 0,
    evaluatedCount: 0,
    evaluationStatusKnown: false,
    updatedAt: ''
  }
}
const jwEvaluationState = ref(createInitialJwEvaluationState())
const linkeMyCoursesState = ref({
  status: 'idle',
  message: '',
  termList: [],
  scoreTermList: [],
  currentTerm: '',
  courses: [],
  scored: [],
  unscored: [],
  studying: [],
  totalCount: 0,
  scoredCount: 0,
  unscoredCount: 0,
  studyingCount: 0,
  syncProgress: null,
  updatedAt: ''
})
const linkeCollectionState = ref({
  status: 'idle',
  message: '',
  courses: [],
  count: 0,
  updatedAt: ''
})
const linkeAssistantView = ref('home')
const linkeAssistantHistory = ref([])
const linkeWorkbenchTab = ref('todo')
const linkeMyCoursesTab = ref('all')
const linkeCourseSearchKeyword = ref('')
const linkeCourseSearchState = ref({
  status: 'idle',
  message: '',
  keyword: '',
  courses: []
})
const linkeCourseSearchFocused = ref(false)
const linkeCourseDetailState = ref({
  status: 'idle',
  message: '',
  course: null,
  comments: [],
  commentCount: 0,
  rating: null,
  scoreStats: null,
  commentPage: 1,
  commentPageSize: 50,
  commentHasMore: false,
  commentLoadingMore: false,
  availableTerms: [],
  selectedTerm: ''
})
const linkeReviewCourse = ref(null)
const linkeReviewMode = ref('create')
const linkeReviewForm = ref({
  commentStar1: 0,
  commentStar2: 0,
  commentStar3: 0,
  commentMessage: ''
})
const linkeReviewState = ref({
  status: 'idle',
  message: ''
})
const linkeReviewSubmitting = ref(false)
const linkeSearchHistoryKey = 'course_search_recent_keywords'
const linkeSearchRecentKeywords = ref(loadLinkeSearchRecentKeywords())
const linkeCollectedCourseIds = ref(new Set())
const linkeDetailCollectionLoading = ref(false)
const linkeDetailCommentFilter = ref('all')
const linkeDetailCommentSort = ref('likeDesc')
const linkeDetailFilterMenuOpen = ref(false)
const linkeDetailTermMenuOpen = ref(false)
const linkeEvaluatedActionCourse = ref(null)
const linkeDeleteActionLoading = ref(false)
const linkeStarLabels = ['很差', '较差', '一般', '较好', '很好']
const jwHomeTitle = '教务主页'
const legacyPersonalCenterTitle = '个人中心'
const favoritesNavigationGroupTitle = '收藏夹'
const jwNavigationGroupIconPathMap = {
  favorite: [
    'M6.5 4.5h11v15L12 16.5l-5.5 3z',
    'M9 8.5h6'
  ],
  desktop: [
    'M5 5.5h14v10H5z',
    'M9 19h6',
    'M12 15.5V19'
  ],
  student: [
    'M4.5 6.5h6.5c1.2 0 2 .8 2 2v10c0-1.2-.8-2-2-2H4.5z',
    'M19.5 6.5H13c-1.2 0-2 .8-2 2v10c0-1.2.8-2 2-2h6.5z'
  ],
  cultivation: [
    'M5 7h14',
    'M5 12h14',
    'M5 17h14',
    'M8 5v4',
    'M13 10v4',
    'M16 15v4'
  ],
  exam: [
    'M8 4.5h8l2.5 2.5v12.5h-13v-15z',
    'M15.5 4.5V7h3',
    'M8.5 12h7',
    'M8.5 16h5'
  ],
  practice: [
    'M8 8V6.5c0-1.1.9-2 2-2h4c1.1 0 2 .9 2 2V8',
    'M4.5 8h15v10.5h-15z',
    'M4.5 12h15'
  ],
  evaluation: [
    'M5.5 5.5h13v10h-7l-4 3v-3h-2z',
    'M8.5 10.5 11 13l4.5-5'
  ],
  exchange: [
    'M7 7h10l-2-2',
    'M17 7l-2 2',
    'M17 17H7l2 2',
    'M7 17l2-2'
  ],
  folder: [
    'M4 7h6l1.8 2h8.2v9.5H4z',
    'M4 7V5.5h5.3L11 7'
  ]
}
const personalCenterNavigationItem = {
  id: 'linke-personal-center',
  title: jwHomeTitle,
  level: 0,
  disabled: false,
  breadcrumbTitles: [jwHomeTitle]
}
const featureItems = [
  {
    key: 'browser',
    label: '教务系统'
  }
]
const activeFeature = ref(normalizeFeatureKey(window.localStorage.getItem('linke.activeFeature')))
const showJwPageHeader = computed(() => activeFeature.value === 'browser' && hasJwNavigation.value)
const currentJwPageBreadcrumb = computed(() => {
  const rawBreadcrumb = Array.isArray(browserState.value.jwPageBreadcrumb)
    ? browserState.value.jwPageBreadcrumb
    : [
        browserState.value.jwPageGroupTitle,
        browserState.value.jwPageParentTitle,
        browserState.value.jwPageTitle
      ]
  const crumbs = []
  for (const value of rawBreadcrumb) {
    const text = normalizeJwHomeTitle(value)
    if (text && crumbs[crumbs.length - 1] !== text) {
      crumbs.push(text)
    }
  }
  return crumbs.length > 0 ? crumbs : [personalCenterNavigationItem.title]
})
const webFeaturePlaceholder = computed(() => {
  const loadError = browserState.value.loadError || null
  if (loadError) {
    const description = String(loadError.description || loadError.code || '加载失败')
    return `无法打开该网页：${description}`
  }

  const prefix = browserState.value.loading ? '正在打开' : ''
  return `${prefix}教务系统网页区域`
})
let activeFeatureSyncSource = ''
let activeFeatureRequestId = 0

const hasJwNavigationCatalog = computed(() => (
  Array.isArray(jwNavigationCatalog.value.groups) &&
  jwNavigationCatalog.value.groups.some((group) => Array.isArray(group.items) && group.items.length > 0)
))
const isTrustedJwPage = computed(() => {
  try {
    return new URL(String(browserState.value.url || '')).hostname === 'jw.sdufe.edu.cn'
  } catch {
    return false
  }
})
const favoriteNavigationIds = computed(() => new Set(
  (Array.isArray(jwNavigationFavorites.value.items) ? jwNavigationFavorites.value.items : [])
    .map((item) => String(item.id || ''))
    .filter(Boolean)
))
const originalNavigationEntriesById = computed(() => {
  const entries = new Map()
  const groups = Array.isArray(jwNavigationCatalog.value.groups) ? jwNavigationCatalog.value.groups : []
  for (const group of groups) {
    const items = Array.isArray(group?.items) ? group.items : []
    items.forEach((item, itemIndex) => {
      const id = String(item?.id || '')
      if (!id) {
        return
      }

      entries.set(id, {
        group,
        item,
        itemIndex,
        disabled: isJwNavigationItemDisabled(group, item, itemIndex),
        breadcrumbTitles: getJwNavigationBreadcrumb(group, item, itemIndex)
      })
    })
  }
  return entries
})
const favoriteNavigationItems = computed(() => {
  const storedItems = Array.isArray(jwNavigationFavorites.value.items) ? jwNavigationFavorites.value.items : []
  const items = []

  for (const favorite of storedItems) {
    const id = String(favorite?.id || '')
    const entry = originalNavigationEntriesById.value.get(id)
    if (
      !entry ||
      entry.disabled ||
      getNavigationItemLevel(entry.item) < 1 ||
      isBranchlessSecondLevelNavigationItem(entry.group, entry.item, entry.itemIndex)
    ) {
      continue
    }

    const breadcrumbTitles = entry.breadcrumbTitles
    items.push({
      ...entry.item,
      id,
      title: String(favorite.title || entry.item.title || '').trim(),
      level: 0,
      disabled: false,
      source: 'favorite',
      groupTitle: entry.group?.title || '',
      parentTitle: breadcrumbTitles.length > 2 ? breadcrumbTitles[breadcrumbTitles.length - 2] : '',
      breadcrumbTitles,
      contextTitle: breadcrumbTitles.slice(0, -1).join(' / ')
    })
  }

  return items
})
const favoriteNavigationSection = computed(() => ({
  key: 'linke-favorites-folder',
  title: favoritesNavigationGroupTitle,
  kind: 'favorites',
  emptyText: '暂无收藏',
  items: favoriteNavigationItems.value
}))
const isFavoriteNavigationEmpty = computed(() => favoriteNavigationSection.value.items.length === 0)
const emptyFavoriteNavigationExpanded = ref(false)
const renderedJwCatalogSections = computed(() => {
  const groups = (Array.isArray(jwNavigationCatalog.value.groups) ? jwNavigationCatalog.value.groups : [])
    .map((group) => {
      const items = Array.isArray(group?.items) ? [...group.items] : []
      const tree = createJwNavigationTree(items)
      return {
        ...group,
        items,
        tree,
        visibleTree: getVisibleNavigationTree({ ...group, items, tree })
      }
    })
    .filter((group) => group.visibleTree.length > 0)

  if (groups.length === 0) {
    return []
  }

  return [
    {
      key: 'linke-home-entry',
      title: jwHomeTitle,
      kind: 'item',
      item: { ...personalCenterNavigationItem }
    },
    ...groups
  ]
})
const isJwLoginOrEntryPage = computed(() => {
  const title = String(browserState.value.title || '')
  if (/登录|用户登录|统一身份认证/.test(title)) {
    return true
  }

  try {
    const url = new URL(String(browserState.value.url || ''))
    const pathname = url.pathname.replace(/\/+$/, '')
    if (!pathname) {
      return true
    }
    return /login|slogin|cas/i.test(pathname)
  } catch {
    return true
  }
})
const hasJwNavigation = computed(() => (
  isTrustedJwPage.value &&
  hasJwNavigationCatalog.value &&
  !browserState.value.jwOriginalMode &&
  !isJwLoginOrEntryPage.value
))
const showJwNavigation = computed(() => activeFeature.value === 'browser' && hasJwNavigation.value)
const showJwShellControls = computed(() => activeFeature.value === 'browser' && hasJwNavigation.value)
const showJwNavigationPanel = computed(() => showJwNavigation.value && !jwNavigationCollapsed.value)
const showJwAgentPanel = computed(() => showJwShellControls.value && jwAgentPanelOpen.value)
const showJwNavigationSettingsPanel = computed(() => showJwNavigationPanel.value && jwNavigationSettingsOpen.value)
const jwEvaluationLoading = computed(() => jwEvaluationState.value.status === 'loading')
const jwEvaluationStatusReady = computed(() => jwEvaluationState.value.status === 'ready')
const linkeMyCoursesLoading = computed(() => linkeMyCoursesState.value.status === 'loading')
const linkeMyCoursesReady = computed(() => linkeMyCoursesState.value.status === 'ready')
const jwEvaluationPendingCourses = computed(() => (
  Array.isArray(jwEvaluationState.value.pending) ? jwEvaluationState.value.pending : []
))
const jwEvaluationPendingCountText = computed(() => {
  if (jwEvaluationLoading.value) return '同步中'
  if (jwEvaluationState.value.status === 'error') return '同步失败'
  if (!jwEvaluationStatusReady.value) return '待同步'
  if (!jwEvaluationState.value.evaluationStatusKnown) return `${Number(jwEvaluationState.value.totalCount || 0)} 门候选`
  return `${jwEvaluationState.value.pendingCount || jwEvaluationPendingCourses.value.length} 门`
})
const jwEvaluationSummaryText = computed(() => {
  if (jwEvaluationLoading.value) return '正在读取教务系统'
  if (jwEvaluationState.value.status === 'error') return '读取失败'
  if (!jwEvaluationStatusReady.value) return isJwLoginOrEntryPage.value ? '登录后可同步' : '打开工作台后同步'
  const total = Number(jwEvaluationState.value.totalCount || 0)
  const evaluated = Number(jwEvaluationState.value.evaluatedCount || 0)
  const termCount = Array.isArray(jwEvaluationState.value.termList) ? jwEvaluationState.value.termList.length : 0
  if (!jwEvaluationState.value.evaluationStatusKnown) {
    return `${termCount} 个学期 · 已评价状态未同步`
  }
  return `${termCount} 个学期 · ${evaluated}/${total} 已评价`
})
const jwEvaluationUpdatedText = computed(() => {
  if (!jwEvaluationState.value.updatedAt) return ''
  const date = new Date(jwEvaluationState.value.updatedAt)
  if (Number.isNaN(date.getTime())) return ''
  const hours = String(date.getHours()).padStart(2, '0')
  const minutes = String(date.getMinutes()).padStart(2, '0')
  return `${hours}:${minutes}`
})
let jwEvaluationRequestId = 0
let linkeMyCoursesRequestId = 0
const linkeEvaluationCourses = computed(() => (
  Array.isArray(jwEvaluationState.value.courses) ? jwEvaluationState.value.courses : []
))
const linkeEvaluatedCourses = computed(() => (
  Array.isArray(jwEvaluationState.value.evaluated) ? jwEvaluationState.value.evaluated : []
))
const linkeWorkbenchTabs = computed(() => [
  { value: 'todo', label: `待评价 ${jwEvaluationPendingCourses.value.length}` },
  { value: 'done', label: `已评价 ${linkeEvaluatedCourses.value.length}` },
  { value: 'all', label: `全部 ${linkeEvaluationCourses.value.length}` }
])
const linkeWorkbenchVisibleCourses = computed(() => {
  if (linkeWorkbenchTab.value === 'done') return linkeEvaluatedCourses.value
  if (linkeWorkbenchTab.value === 'all') return linkeEvaluationCourses.value
  return jwEvaluationPendingCourses.value
})
const linkeMyCourses = computed(() => (
  Array.isArray(linkeMyCoursesState.value.courses) ? linkeMyCoursesState.value.courses : []
))
const linkeMyScoredCourses = computed(() => (
  Array.isArray(linkeMyCoursesState.value.scored) ? linkeMyCoursesState.value.scored : []
))
const linkeMyUnscoredCourses = computed(() => (
  Array.isArray(linkeMyCoursesState.value.unscored) ? linkeMyCoursesState.value.unscored : []
))
const linkeMyStudyingCourses = computed(() => (
  Array.isArray(linkeMyCoursesState.value.studying) ? linkeMyCoursesState.value.studying : []
))
const linkeMyCoursesTabs = computed(() => [
  { value: 'all', label: `全部 ${linkeMyCourses.value.length}` },
  { value: 'scored', label: `已出成绩 ${linkeMyScoredCourses.value.length}` },
  { value: 'unscored', label: `未出成绩 ${linkeMyUnscoredCourses.value.length}` }
])
const linkeMyCoursesVisibleCourses = computed(() => {
  if (linkeMyCoursesTab.value === 'scored') return linkeMyScoredCourses.value
  if (linkeMyCoursesTab.value === 'unscored') return linkeMyUnscoredCourses.value
  return linkeMyCourses.value
})
const linkeMyCoursesVisibleGroups = computed(() => {
  const groupMap = new Map()
  for (const course of linkeMyCoursesVisibleCourses.value) {
    const term = String(course?.term || course?.courseTerm || '未知学期').trim() || '未知学期'
    if (!groupMap.has(term)) {
      groupMap.set(term, [])
    }
    groupMap.get(term).push(course)
  }
  return Array.from(groupMap.entries())
    .sort(([termA], [termB]) => String(termB).localeCompare(String(termA)))
    .map(([term, courses]) => ({ term, courses }))
})
const linkeMyCoursesProgress = computed(() => linkeMyCoursesState.value.syncProgress || null)
const linkeMyCoursesProgressPercent = computed(() => {
  const percent = Number(linkeMyCoursesProgress.value?.percent ?? 0)
  if (Number.isNaN(percent)) return 0
  return Math.max(0, Math.min(100, Math.round(percent)))
})
const linkeMyCoursesProgressMessage = computed(() => (
  String(linkeMyCoursesProgress.value?.message || linkeMyCoursesState.value.message || '正在同步我的课程').trim()
))
const linkeMyCoursesProgressDetail = computed(() => {
  const progress = linkeMyCoursesProgress.value
  const total = Number(progress?.total || 0)
  const current = Number(progress?.current || 0)
  if (total > 0) {
    const term = progress?.term ? ` · ${progress.term}` : ''
    return `${Math.min(current, total)}/${total} 个学期${term}`
  }
  return '正在连接教务系统'
})
const linkeMyCoursesEntryTitle = computed(() => {
  if (linkeMyCoursesLoading.value) return `${linkeMyCoursesProgressPercent.value}%`
  return linkeMyCoursesReady.value ? `${linkeMyCourses.value.length} 门` : '课程总览'
})
const linkeMyCoursesSummaryText = computed(() => {
  if (linkeMyCoursesLoading.value) return linkeMyCoursesProgressMessage.value
  if (linkeMyCoursesState.value.status === 'error') return '读取失败'
  if (!linkeMyCoursesReady.value) return '等待同步'
  const scored = Number(linkeMyCoursesState.value.scoredCount || linkeMyScoredCourses.value.length)
  const unscored = Number(linkeMyCoursesState.value.unscoredCount || linkeMyUnscoredCourses.value.length)
  return `${scored} 门已出成绩 · ${unscored} 门未出成绩`
})
const linkeMyCoursesSubtitle = computed(() => {
  if (!linkeMyCoursesReady.value || linkeMyCourses.value.length === 0) {
    return '从教务选课日志整理课程，成绩页仅用于标记是否已出成绩。'
  }
  const currentTerm = linkeMyCoursesState.value.currentTerm
  if (currentTerm) {
    return `${currentTerm} 修读中 ${linkeMyStudyingCourses.value.length} 门。`
  }
  return linkeMyCoursesSummaryText.value
})
const linkeMyCoursesEmptyText = computed(() => {
  if (linkeMyCoursesTab.value === 'scored') return '当前没有已出成绩课程'
  if (linkeMyCoursesTab.value === 'unscored') return '当前没有未出成绩课程'
  return '当前没有可展示课程'
})
const linkeMyCoursesEmptyDescription = computed(() => (
  linkeMyCoursesState.value.message || '成绩页只负责标记是否已出成绩，课程全集来自教务选课日志。'
))
const linkeCollectionCourses = computed(() => (
  Array.isArray(linkeCollectionState.value.courses) ? linkeCollectionState.value.courses : []
))
const linkeCollectionLoading = computed(() => linkeCollectionState.value.status === 'loading')
const linkeCollectionEntryTitle = computed(() => {
  if (linkeCollectionLoading.value) return '同步中'
  if (linkeCollectionState.value.status === 'ready') return `${linkeCollectionCourses.value.length} 门`
  if (linkeCollectionState.value.status === 'error') return '读取失败'
  return '收藏课程'
})
const linkeCollectionSummaryText = computed(() => {
  if (linkeCollectionLoading.value) return '正在读取收藏'
  if (linkeCollectionState.value.status === 'error') return '稍后重试'
  if (linkeCollectionState.value.status !== 'ready') return '集中查看已收藏课程'
  return linkeCollectionCourses.value.length > 0 ? `已收藏 ${linkeCollectionCourses.value.length} 门课程` : '暂无收藏课程'
})
const linkeCollectionSubtitle = computed(() => {
  if (linkeCollectionCourses.value.length === 0) return '收藏过的课程会在这里集中展示。'
  return `共收藏 ${linkeCollectionCourses.value.length} 门课程。`
})
const linkeWorkbenchSubtitle = computed(() => {
  if (!jwEvaluationStatusReady.value || linkeEvaluationCourses.value.length === 0) {
    return '管理待评价与已评价课程，持续补全反馈。'
  }
  if (jwEvaluationPendingCourses.value.length === 0) {
    return '所有课程已完成评价，可回看或修改。'
  }
  return `还有 ${jwEvaluationPendingCourses.value.length} 门课程待评价。`
})
const linkeWorkbenchEmptyText = computed(() => {
  if (linkeWorkbenchTab.value === 'done') return '当前还没有已评价课程'
  if (linkeWorkbenchTab.value === 'all') return '当前没有课程可展示'
  return '当前没有待评价课程'
})
const linkeWorkbenchEmptyDescription = computed(() => {
  if (jwEvaluationState.value.message) return jwEvaluationState.value.message
  if (linkeWorkbenchTab.value === 'todo') return '当前没有需要处理的课程，稍后可重新进入或等待同步完成。'
  return '当前没有可展示的评价课程，稍后可重新进入或等待同步完成。'
})
const linkeCourseSearchLoading = computed(() => linkeCourseSearchState.value.status === 'loading')
const linkeCourseSearchResults = computed(() => (
  Array.isArray(linkeCourseSearchState.value.courses) ? linkeCourseSearchState.value.courses : []
))
const linkeDetailCourse = computed(() => linkeCourseDetailState.value.course || null)
const linkeDetailIsCollected = computed(() => (
  linkeCollectedCourseIds.value.has(getCourseId(linkeDetailCourse.value)) ||
  linkeDetailCourse.value?.isCollected === true
))
const linkeDetailCommentFilterOptions = [
  { value: 'all', label: '全部' },
  { value: 'high', label: '高分' },
  { value: 'normal', label: '普通' },
  { value: 'low', label: '低分' },
  { value: 'noScore', label: '未显示成绩' }
]
const linkeDetailCommentSortOptions = [
  { value: 'likeDesc', label: '最热' },
  { value: 'timeDesc', label: '最新' }
]
const linkeDetailFilteredComments = computed(() => {
  const rows = Array.isArray(linkeCourseDetailState.value.comments) ? linkeCourseDetailState.value.comments : []
  if (linkeDetailCommentFilter.value === 'all') return rows
  if (linkeDetailCommentFilter.value === 'noScore') {
    return rows.filter((comment) => !hasCommentScore(comment))
  }
  return rows.filter((comment) => getCommentScoreRange(comment) === linkeDetailCommentFilter.value)
})
const linkeDetailSortedComments = computed(() => {
  const rows = linkeDetailFilteredComments.value.slice()
  if (linkeDetailCommentSort.value === 'timeDesc') {
    return rows.sort((a, b) => String(b?.commentTime || '').localeCompare(String(a?.commentTime || '')))
  }
  return rows.sort((a, b) => Number(b?.likeCount || 0) - Number(a?.likeCount || 0))
})
const linkeDetailHasRatingSummary = computed(() => (
  linkeCourseDetailState.value.rating && linkeCourseDetailState.value.rating.starAvgTotal != null
))
const linkeDetailCommentCountText = computed(() => {
  const rating = linkeCourseDetailState.value.rating
  const comments = Array.isArray(linkeCourseDetailState.value.comments) ? linkeCourseDetailState.value.comments : []
  let count = 0
  if (linkeCourseDetailState.value.commentCount != null && Number(linkeCourseDetailState.value.commentCount) !== 0) {
    count = Number(linkeCourseDetailState.value.commentCount)
  } else if (comments.length > 0) {
    count = comments.length
  } else if (rating && rating.starCount != null && Number(rating.starCount) > 0) {
    count = Number(rating.starCount)
  }
  return `${count}条`
})
const linkeDetailShowScoreCommentBlock = computed(() => {
  const stats = linkeCourseDetailState.value.scoreStats
  const rating = linkeCourseDetailState.value.rating
  const comments = Array.isArray(linkeCourseDetailState.value.comments) ? linkeCourseDetailState.value.comments : []
  return Number(stats?.count || 0) > 0 ||
    rating?.starAvgTotal != null ||
    Number(linkeCourseDetailState.value.commentCount || 0) > 0 ||
    comments.length > 0
})
const linkeAssistantTitle = computed(() => {
  const titles = {
    home: '林课助手',
    myCourses: '我的课程',
    collections: '我的收藏课程',
    workbench: '评价工作台',
    database: '林课数据库',
    detail: '课程详情',
    review: '课程评价'
  }
  return titles[linkeAssistantView.value] || '林课助手'
})
const linkeAssistantKicker = computed(() => {
  return ''
})
const linkeReviewDimensions = [
  {
    key: 'commentStar1',
    title: '内容价值',
    hint: '是否讲清核心知识，学完后有没有确实学到东西的感觉'
  },
  {
    key: 'commentStar2',
    title: '管理轻松度',
    hint: '签到、作业、点名等要求是否合理，课堂管理是否清晰'
  },
  {
    key: 'commentStar3',
    title: '良师指数',
    hint: '老师是否耐心负责、愿意沟通，评分和要求是否相对公平'
  }
]
const linkeReviewFormReady = computed(() => (
  getCourseId(linkeReviewCourse.value) &&
  linkeReviewForm.value.commentStar1 >= 1 &&
  linkeReviewForm.value.commentStar2 >= 1 &&
  linkeReviewForm.value.commentStar3 >= 1 &&
  linkeReviewForm.value.commentMessage.trim().length > 0
))
const linkeReviewHintText = computed(() => {
  if (!getCourseId(linkeReviewCourse.value)) return '请先选择课程'
  if (linkeReviewForm.value.commentStar1 < 1 || linkeReviewForm.value.commentStar2 < 1 || linkeReviewForm.value.commentStar3 < 1) {
    return '请完成三个维度的评分'
  }
  if (!linkeReviewForm.value.commentMessage.trim()) return '请填写文字评价'
  return ''
})

function loadLinkeSearchRecentKeywords() {
  try {
    const rows = JSON.parse(window.localStorage.getItem(linkeSearchHistoryKey) || '[]')
    return Array.isArray(rows) ? rows.map((item) => String(item || '').trim()).filter(Boolean).slice(0, 6) : []
  } catch {
    return []
  }
}

function saveLinkeRecentKeyword(keyword) {
  const value = String(keyword || '').trim()
  if (!value) return
  const next = [value, ...linkeSearchRecentKeywords.value.filter((item) => item !== value)].slice(0, 6)
  linkeSearchRecentKeywords.value = next
  window.localStorage.setItem(linkeSearchHistoryKey, JSON.stringify(next))
}

function clearLinkeRecentKeywords() {
  linkeSearchRecentKeywords.value = []
  window.localStorage.removeItem(linkeSearchHistoryKey)
}

function useLinkeRecentKeyword(keyword) {
  linkeCourseSearchKeyword.value = keyword
  searchLinkeCourses()
}

function clearLinkeSearchKeyword() {
  linkeCourseSearchKeyword.value = ''
  linkeCourseSearchState.value = {
    status: 'idle',
    message: '',
    keyword: '',
    courses: []
  }
}

async function loadLinkeCollections(force = false) {
  if (typeof desktop.getLinkeCollections !== 'function') return
  if (!force && linkeCollectionState.value.status === 'loading') return
  if (!force && linkeCollectionState.value.status === 'ready') return
  linkeCollectionState.value = {
    ...linkeCollectionState.value,
    status: 'loading',
    message: '正在读取收藏课程'
  }
  try {
    const result = await desktop.getLinkeCollections({ force })
    const ids = Array.isArray(result?.courseIds) ? result.courseIds : []
    linkeCollectedCourseIds.value = new Set(ids.map((id) => getCourseId({ courseId: id })).filter(Boolean))
    linkeCollectionState.value = {
      status: 'ready',
      message: '',
      courses: Array.isArray(result?.courses) ? result.courses : [],
      count: Number(result?.count || ids.length || 0),
      updatedAt: new Date().toISOString()
    }
  } catch (error) {
    const message = error?.message || '收藏课程读取失败'
    if (message.includes('请先登录')) {
      linkeCollectionState.value = {
        ...linkeCollectionState.value,
        status: 'idle',
        message: ''
      }
      return
    }
    linkeCollectionState.value = {
      ...linkeCollectionState.value,
      status: 'error',
      message
    }
  }
}

async function loadLinkeCollectionIds(force = false) {
  await loadLinkeCollections(force)
}

function isLinkeCourseCollected(course) {
  return linkeCollectedCourseIds.value.has(getCourseId(course)) || course?.isCollected === true
}

async function toggleLinkeCourseCollection(course) {
  const courseId = getCourseId(course)
  if (!courseId || typeof desktop.setLinkeCourseCollection !== 'function' || linkeDetailCollectionLoading.value) {
    return
  }
  linkeDetailCollectionLoading.value = true
  try {
    const nextCollected = !linkeDetailIsCollected.value
    await desktop.setLinkeCourseCollection({
      courseId,
      collected: nextCollected,
      courseName: course?.courseName || course?.lessonName || '',
      lessonName: course?.lessonName || course?.courseName || '',
      teacherName: course?.teacherName || ''
    })
    const next = new Set(linkeCollectedCourseIds.value)
    if (nextCollected) next.add(courseId)
    else next.delete(courseId)
    linkeCollectedCourseIds.value = next
    updateLinkeCollectionStateAfterToggle(course, nextCollected)
    if (linkeCourseDetailState.value.course && getCourseId(linkeCourseDetailState.value.course) === courseId) {
      linkeCourseDetailState.value = {
        ...linkeCourseDetailState.value,
        course: {
          ...linkeCourseDetailState.value.course,
          isCollected: nextCollected
        }
      }
    }
  } catch (error) {
    linkeCourseDetailState.value = {
      ...linkeCourseDetailState.value,
      message: error?.message || '收藏状态更新失败'
    }
  } finally {
    linkeDetailCollectionLoading.value = false
  }
}

function updateLinkeCollectionStateAfterToggle(course, collected) {
  const courseId = getCourseId(course)
  if (!courseId) return
  const currentCourses = Array.isArray(linkeCollectionState.value.courses)
    ? linkeCollectionState.value.courses
    : []
  const nextCourses = collected
    ? [
        sanitizeCourseForIpc(course, { isCollected: true }),
        ...currentCourses.filter((item) => getCourseId(item) !== courseId)
      ]
    : currentCourses.filter((item) => getCourseId(item) !== courseId)
  linkeCollectionState.value = {
    ...linkeCollectionState.value,
    status: 'ready',
    message: '',
    courses: nextCourses,
    count: nextCourses.length,
    updatedAt: new Date().toISOString()
  }
}

function getStarLabel(value) {
  const index = Math.max(1, Math.min(5, Number(value) || 0)) - 1
  return linkeStarLabels[index] || ''
}

function applyBrowserState(state) {
  browserState.value = { ...browserState.value, ...state }
  const stateBreadcrumb = Array.isArray(state.jwPageBreadcrumb) ? state.jwPageBreadcrumb : []
  if (
    state.jwOriginalMode === true ||
    isPersonalCenterNavigationTitle(state.jwPageTitle) ||
    (
      stateBreadcrumb.length === 1 &&
      isPersonalCenterNavigationTitle(stateBreadcrumb[0])
    )
  ) {
    activeNavigationItemId.value = personalCenterNavigationItem.id
  }
  if (state.activeFeature) {
    const nextFeature = normalizeFeatureKey(state.activeFeature)
    if (activeFeature.value !== nextFeature) {
      activeFeatureSyncSource = 'browser-state'
      activeFeature.value = nextFeature
    }
  }
}

function normalizeJwHomeTitle(value) {
  const text = String(value || '').trim()
  return text === legacyPersonalCenterTitle ? personalCenterNavigationItem.title : text
}

function normalizeNavigationTitleKey(value) {
  return String(value || '').replace(/\s+/g, '').trim()
}

function isPersonalCenterNavigationTitle(value) {
  const text = String(value || '').trim()
  return text === personalCenterNavigationItem.title || text === legacyPersonalCenterTitle
}

function applyJwNavigationCatalog(catalog) {
  jwNavigationCatalog.value = {
    ...catalog,
    groups: Array.isArray(catalog?.groups) ? catalog.groups : []
  }
}

function applyJwNavigationFavorites(payload) {
  jwNavigationFavorites.value = {
    ...payload,
    items: Array.isArray(payload?.items) ? payload.items : []
  }
}

function syncJwShellLayout() {
  if (typeof desktop.setJwShellLayout !== 'function') {
    return
  }

  desktop.setJwShellLayout({
    navigationCollapsed: showJwShellControls.value ? jwNavigationCollapsed.value : false,
    agentPanelOpen: showJwShellControls.value ? jwAgentPanelOpen.value : false
  }).catch(() => {})
}

function toggleJwNavigationPanel() {
  jwNavigationCollapsed.value = !jwNavigationCollapsed.value
}

function toggleJwAgentPanel() {
  jwAgentPanelOpen.value = !jwAgentPanelOpen.value
}

function toggleJwNavigationSettings() {
  jwNavigationSettingsOpen.value = !jwNavigationSettingsOpen.value
}

function closeJwNavigationSettings() {
  jwNavigationSettingsOpen.value = false
}

function applyJwEvaluationResult(result) {
  jwEvaluationState.value = {
    status: 'ready',
    message: result?.message || '',
    termList: Array.isArray(result?.termList) ? result.termList : [],
    courses: Array.isArray(result?.courses) ? result.courses : [],
    pending: Array.isArray(result?.pending) ? result.pending : [],
    evaluated: Array.isArray(result?.evaluated) ? result.evaluated : [],
    totalCount: Number(result?.totalCount || 0),
    pendingCount: Number(result?.pendingCount || 0),
    evaluatedCount: Number(result?.evaluatedCount || 0),
    evaluationStatusKnown: result?.evaluationStatusKnown !== false,
    updatedAt: result?.updatedAt || new Date().toISOString()
  }
}

async function runJwEvaluationRequest(request, loadingMessage) {
  if (jwEvaluationLoading.value) {
    return
  }
  const requestId = ++jwEvaluationRequestId
  jwEvaluationState.value = {
    ...jwEvaluationState.value,
    status: 'loading',
    message: loadingMessage
  }
  try {
    const result = await request()
    if (requestId !== jwEvaluationRequestId) {
      return
    }
    applyJwEvaluationResult(result)
  } catch (error) {
    if (requestId !== jwEvaluationRequestId) {
      return
    }
    jwEvaluationState.value = {
      ...jwEvaluationState.value,
      status: 'error',
      message: error?.message || '待评价课程读取失败'
    }
  }
}

async function refreshJwEvaluationCourses() {
  if (!showJwAgentPanel.value) {
    return
  }
  const request = typeof desktop.refreshJwEvaluationStatus === 'function'
    ? () => desktop.refreshJwEvaluationStatus()
    : () => desktop.getJwEvaluationCourses({})
  return runJwEvaluationRequest(request, '正在刷新已评价状态')
}

async function syncJwEvaluationCourses() {
  if (!showJwAgentPanel.value) {
    return
  }
  const request = typeof desktop.syncJwEvaluationCourses === 'function'
    ? () => desktop.syncJwEvaluationCourses()
    : () => desktop.getJwEvaluationCourses({ force: true })
  return runJwEvaluationRequest(request, '正在从教务同步课程')
}

async function hydrateJwEvaluationSnapshot() {
  if (typeof desktop.getJwEvaluationSnapshot !== 'function') {
    return false
  }
  try {
    const snapshot = await desktop.getJwEvaluationSnapshot()
    if (!snapshot) {
      jwEvaluationState.value = createInitialJwEvaluationState()
      return false
    }
    applyJwEvaluationResult(snapshot)
    return true
  } catch {
    return false
  }
}

async function refreshLinkeMyCourses(force = false) {
  if (typeof desktop.getJwMyCourses !== 'function') {
    return
  }
  if (!force && linkeMyCoursesLoading.value) {
    return
  }
  if (!force && linkeMyCoursesReady.value) {
    return
  }
  if (!force && !showJwAgentPanel.value) {
    return
  }

  const requestId = `my-courses-${Date.now()}-${++linkeMyCoursesRequestId}`
  linkeMyCoursesState.value = {
    ...linkeMyCoursesState.value,
    status: 'loading',
    message: '正在读取我的课程',
    syncProgress: {
      requestId,
      stage: 'start',
      message: '准备同步我的课程',
      current: 0,
      total: 0,
      percent: 0
    }
  }
  try {
    const result = await desktop.getJwMyCourses({ force, requestId })
    if (linkeMyCoursesState.value.syncProgress?.requestId !== requestId) {
      return
    }
    linkeMyCoursesState.value = {
      status: 'ready',
      message: result?.message || '',
      termList: Array.isArray(result?.termList) ? result.termList : [],
      scoreTermList: Array.isArray(result?.scoreTermList) ? result.scoreTermList : [],
      currentTerm: result?.currentTerm || '',
      courses: Array.isArray(result?.courses) ? result.courses : [],
      scored: Array.isArray(result?.scored) ? result.scored : [],
      unscored: Array.isArray(result?.unscored) ? result.unscored : [],
      studying: Array.isArray(result?.studying) ? result.studying : [],
      totalCount: Number(result?.totalCount || 0),
      scoredCount: Number(result?.scoredCount || 0),
      unscoredCount: Number(result?.unscoredCount || 0),
      studyingCount: Number(result?.studyingCount || 0),
      syncProgress: null,
      updatedAt: result?.updatedAt || new Date().toISOString()
    }
  } catch (error) {
    if (linkeMyCoursesState.value.syncProgress?.requestId !== requestId) {
      return
    }
    linkeMyCoursesState.value = {
      ...linkeMyCoursesState.value,
      status: 'error',
      message: error?.message || '我的课程读取失败',
      syncProgress: null
    }
  }
}

function applyLinkeMyCoursesProgress(payload = {}) {
  const requestId = String(payload.requestId || '')
  if (!requestId || linkeMyCoursesState.value.syncProgress?.requestId !== requestId) {
    return
  }
  linkeMyCoursesState.value = {
    ...linkeMyCoursesState.value,
    message: payload.message || linkeMyCoursesState.value.message,
    syncProgress: {
      ...linkeMyCoursesState.value.syncProgress,
      ...payload
    }
  }
}

function openLinkeAssistantView(view) {
  if (linkeAssistantView.value !== view) {
    linkeAssistantHistory.value.push(linkeAssistantView.value)
  }
  linkeAssistantView.value = view
}

function goBackLinkeAssistant() {
  linkeAssistantView.value = linkeAssistantHistory.value.pop() || 'home'
}

function openLinkeWorkbench() {
  openLinkeAssistantView('workbench')
  if (!jwEvaluationStatusReady.value && !jwEvaluationLoading.value) {
    syncJwEvaluationCourses()
  }
  loadLinkeCollectionIds(false)
}

function openLinkeCollections() {
  openLinkeAssistantView('collections')
  loadLinkeCollections(false)
}

function openLinkeMyCourses() {
  openLinkeAssistantView('myCourses')
  refreshLinkeMyCourses(false)
  loadLinkeCollectionIds(false)
}

function openLinkeDatabase() {
  openLinkeAssistantView('database')
  loadLinkeCollectionIds(false)
}

async function openLinkeDatabaseSearch(keyword) {
  const value = String(keyword || '').trim()
  if (!value) {
    return
  }
  jwAgentPanelOpen.value = true
  if (linkeAssistantView.value !== 'database') {
    openLinkeAssistantView('database')
  }
  loadLinkeCollectionIds(false)
  if (
    linkeCourseSearchState.value.status === 'loading' &&
    String(linkeCourseSearchState.value.keyword || '').trim() === value
  ) {
    return
  }
  linkeCourseSearchKeyword.value = value
  await searchLinkeCourses()
}

function getCourseId(course) {
  return String(course?.courseId || course?.md5Hash || '').trim().toLowerCase()
}

function getCourseTitle(course) {
  return course?.lessonName || course?.courseName || '未知课程'
}

function getCourseTeacher(course) {
  return course?.teacherName || '教师信息暂无'
}

function getDisplayCourseType(course) {
  const value = String(course?.courseType || '').trim()
  return value && value !== '通选' ? value : ''
}

function getCourseRatingText(course) {
  const rating = Number(course?.starAvgTotal)
  const count = Number(course?.courseComment || 0)
  if (Number.isNaN(rating) || rating <= 0) return ''
  return `★ ${rating.toFixed(1)}${count > 0 ? `（${count} 评价）` : ''}`
}

function getCourseGradeStatusText(course) {
  if (course?.gradeStatusText) return course.gradeStatusText
  if (course?.hasScore === true) return '已出成绩'
  if (course?.gradeState === 'studying') return '修读中'
  return '未出成绩'
}

function getCourseGradeStateClass(course) {
  if (course?.hasScore === true || course?.gradeState === 'scored') return 'scored'
  if (course?.gradeState === 'studying') return 'studying'
  return 'unscored'
}

function hasScoreBoxplot(course) {
  const stats = course?.scoreStats
  if (!stats || Number(stats.count || 0) <= 0) return false
  return ['minScore', 'maxScore', 'q1Score', 'medianScore', 'q3Score']
    .every((key) => !Number.isNaN(Number(stats[key])))
}

function scoreToFixedScalePosition(score) {
  const value = Math.max(0, Math.min(100, Number(score) || 0))
  if (value <= 60) return (value / 60) * 15
  return 15 + ((value - 60) / 40) * 85
}

function getScoreStat(course, key) {
  return Math.max(0, Math.min(100, Number(course?.scoreStats?.[key]) || 0))
}

function formatScoreValue(value) {
  const number = Number(value)
  if (Number.isNaN(number)) return ''
  return number === Math.floor(number) ? String(Math.round(number)) : number.toFixed(1)
}

function getScoreLeftWhiskerStyle(course) {
  const min = scoreToFixedScalePosition(getScoreStat(course, 'minScore'))
  const q1 = scoreToFixedScalePosition(getScoreStat(course, 'q1Score'))
  return {
    left: `${Math.min(min, q1)}%`,
    width: `${Math.max(0, q1 - min)}%`
  }
}

function getScoreRightWhiskerStyle(course) {
  const q3 = scoreToFixedScalePosition(getScoreStat(course, 'q3Score'))
  const max = scoreToFixedScalePosition(getScoreStat(course, 'maxScore'))
  return {
    left: `${Math.min(q3, max)}%`,
    width: `${Math.max(0, max - q3)}%`
  }
}

function getScoreBoxplotBoxStyle(course) {
  const q1 = scoreToFixedScalePosition(getScoreStat(course, 'q1Score'))
  const q3 = scoreToFixedScalePosition(getScoreStat(course, 'q3Score'))
  return {
    left: `${Math.min(q1, q3)}%`,
    width: `${Math.max(0, Math.abs(q3 - q1))}%`
  }
}

function getScoreMedianStyle(course) {
  return {
    left: `${scoreToFixedScalePosition(getScoreStat(course, 'medianScore'))}%`
  }
}

function getScoreEndpointStyle(course, key) {
  return {
    left: `${scoreToFixedScalePosition(getScoreStat(course, key))}%`
  }
}

function getScoreQuartileLabelStyle(course, key) {
  return {
    left: `${scoreToFixedScalePosition(getScoreStat(course, key))}%`
  }
}

function getScoreDataValueStyle(course, key) {
  return {
    left: `${scoreToFixedScalePosition(getScoreStat(course, key))}%`
  }
}

function formatRating(rating) {
  const value = Number(rating)
  if (Number.isNaN(value) || value <= 0) return '—'
  return value.toFixed(1)
}

function getRatingBarWidth(rating) {
  const value = Number(rating)
  if (Number.isNaN(value) || value <= 0) return 0
  return Math.min(100, (value / 5) * 100)
}

function getScoreCountText(stats) {
  const count = Number(stats?.count || 0)
  return count > 0 ? `${count}人` : '0人'
}

const scoreDistributionRanges = ['0-59', '60-69', '70-79', '80-82', '83-85', '86-88', '89-91', '92-94', '95-97', '98-100']

function getScoreDistributionCounts(stats) {
  const distribution = stats?.distribution
  if (!distribution || typeof distribution !== 'object') return []
  return scoreDistributionRanges.map((range) => Number(distribution[range]) || Number(distribution[range.replace(/-/g, '_')]) || 0)
}

function getScoreOrdinate(stats) {
  const counts = getScoreDistributionCounts(stats)
  if (counts.length === 0) return []
  const max = Math.max(...counts, 0)
  if (max <= 0) return []
  const step = Math.max(1, max <= 5 ? 1 : Math.ceil(max / 5))
  const maxTick = Math.max(1, Math.ceil(max / step) * step)
  const ticks = []
  for (let value = maxTick; value >= step; value -= step) {
    ticks.push(value)
  }
  ticks.push(0)
  return ticks
}

function getScoreOrdinateMaxTick(stats) {
  const ticks = getScoreOrdinate(stats)
  return ticks.length > 0 ? ticks[0] : 1
}

function getScoreTickTop(tick, stats) {
  const maxTick = getScoreOrdinateMaxTick(stats)
  return Math.max(0, Math.min(100, (1 - (Number(tick) || 0) / maxTick) * 100))
}

function getScoreDistributionBars(stats) {
  const counts = getScoreDistributionCounts(stats)
  if (counts.length === 0) return []
  const maxTick = getScoreOrdinateMaxTick(stats)
  if (maxTick <= 0 || Math.max(...counts, 0) <= 0) return []
  const total = Number(stats?.count || 0)
  return scoreDistributionRanges.map((range, index) => {
    const count = counts[index]
    const height = Math.max(0, (count / maxTick) * 100)
    return {
      range,
      count,
      label: range === '0-59' ? '不及格' : range,
      ratio: total > 0 ? `${((count / total) * 100).toFixed(1)}%` : '0%',
      left: `${((index + 0.5) / scoreDistributionRanges.length) * 100}%`,
      height: `${height}%`,
      ratioBottom: `calc(${height}% + 8px)`
    }
  })
}

function getScoreRangeText(stats) {
  if (!stats || Number(stats.count || 0) <= 0) return '—'
  const min = stats.minScore
  const max = stats.maxScore
  if (min === undefined || min === null || min === '' || max === undefined || max === null || max === '') return '—'
  return `${Number(min)}-${Number(max)}`
}

function getScoreAverageText(stats) {
  if (!stats || Number(stats.count || 0) <= 0) return '—'
  const value = stats.avgScore ?? stats.scoreAvg
  if (value === undefined || value === null || value === '') return '—'
  return String(Number(value))
}

function getScoreMedianText(stats) {
  if (!stats || Number(stats.count || 0) <= 0) return '—'
  const value = stats.medianScore
  if (value === undefined || value === null || value === '') return '—'
  return String(Number(value))
}

function getCommentStars(comment) {
  const values = [comment?.commentStar1, comment?.commentStar2, comment?.commentStar3]
    .map((value) => Number(value))
    .filter((value) => !Number.isNaN(value))
  if (values.length === 0) return '☆☆☆☆☆'
  const avg = values.reduce((sum, value) => sum + value, 0) / values.length
  const filled = Math.max(0, Math.min(5, Math.round(avg)))
  return '★'.repeat(filled) + '☆'.repeat(5 - filled)
}

function getCommentScoreValue(comment) {
  const raw = comment?.commenterScore
  if (raw === undefined || raw === null || raw === '') return null
  const value = Number(raw)
  return Number.isNaN(value) ? null : value
}

function hasCommentScore(comment) {
  return getCommentScoreValue(comment) !== null
}

function getCommentScoreBadge(comment) {
  const score = getCommentScoreValue(comment)
  return score === null ? '未显示成绩' : `${score}分`
}

function getCommentScoreRange(comment) {
  const score = getCommentScoreValue(comment)
  if (score === null) return null
  if (score >= 90) return 'high'
  if (score >= 80) return 'normal'
  return 'low'
}

function getCommentRangeCount(range) {
  const rows = Array.isArray(linkeCourseDetailState.value.comments) ? linkeCourseDetailState.value.comments : []
  if (range === 'noScore') return rows.filter((comment) => !hasCommentScore(comment)).length
  return rows.filter((comment) => getCommentScoreRange(comment) === range).length
}

function getCommentFilterText(value) {
  const option = linkeDetailCommentFilterOptions.find((item) => item.value === value)
  const label = option?.label || '全部'
  return value && value !== 'all' ? `${label} (${getCommentRangeCount(value)})` : label
}

function selectLinkeCommentFilter(value) {
  linkeDetailCommentFilter.value = value
  linkeDetailFilterMenuOpen.value = false
}

function selectLinkeDetailTerm(term) {
  const selectedTerm = String(term || '').trim()
  const course = linkeDetailCourse.value
  if (!selectedTerm || !course || selectedTerm === linkeCourseDetailState.value.selectedTerm) {
    linkeDetailTermMenuOpen.value = false
    return
  }
  linkeDetailTermMenuOpen.value = false
  openLinkeCourseDetail(sanitizeCourseForIpc(course, { courseTerm: selectedTerm }), {
    fromEvaluation: course.hasEvaluationPermission === true,
    replace: true
  })
}

function isHighComment(comment) {
  const score = getCommentScoreValue(comment)
  return score !== null && score >= 90
}

function getCommentDisplayName(comment) {
  return comment?.commenterName || comment?.commentUserName || comment?.userName || comment?.nickname || '匿名同学'
}

async function likeLinkeComment(comment) {
  if (!comment?.commentId || typeof desktop.likeLinkeCourseComment !== 'function') return
  try {
    const result = await desktop.likeLinkeCourseComment({ commentId: comment.commentId })
    const comments = (Array.isArray(linkeCourseDetailState.value.comments) ? linkeCourseDetailState.value.comments : []).map((item) => {
      if (String(item?.commentId || '') !== String(comment.commentId || '')) return item
      return {
        ...item,
        hasLiked: result?.liked === true,
        likeCount: Number(result?.likeCount || 0)
      }
    })
    linkeCourseDetailState.value = {
      ...linkeCourseDetailState.value,
      comments
    }
  } catch (error) {
    linkeCourseDetailState.value = {
      ...linkeCourseDetailState.value,
      message: error?.message || '点赞失败'
    }
  }
}

async function loadMoreLinkeComments() {
  const course = linkeDetailCourse.value
  const courseId = getCourseId(course)
  if (!courseId || typeof desktop.getLinkeCourseComments !== 'function' || linkeCourseDetailState.value.commentLoadingMore) {
    return
  }
  const nextPage = Number(linkeCourseDetailState.value.commentPage || 1) + 1
  const pageSize = Number(linkeCourseDetailState.value.commentPageSize || 50)
  linkeCourseDetailState.value = {
    ...linkeCourseDetailState.value,
    commentLoadingMore: true
  }
  try {
    const result = await desktop.getLinkeCourseComments({ courseId, page: nextPage, pageSize })
    const existingIds = new Set((Array.isArray(linkeCourseDetailState.value.comments) ? linkeCourseDetailState.value.comments : [])
      .map((item) => String(item?.commentId || ''))
      .filter(Boolean))
    const nextComments = (Array.isArray(result?.comments) ? result.comments : [])
      .filter((item) => {
        const id = String(item?.commentId || '')
        return !id || !existingIds.has(id)
      })
    linkeCourseDetailState.value = {
      ...linkeCourseDetailState.value,
      comments: [...(Array.isArray(linkeCourseDetailState.value.comments) ? linkeCourseDetailState.value.comments : []), ...nextComments],
      commentPage: Number(result?.page || nextPage),
      commentHasMore: result?.hasMore === true,
      commentLoadingMore: false
    }
  } catch (error) {
    linkeCourseDetailState.value = {
      ...linkeCourseDetailState.value,
      commentLoadingMore: false,
      message: error?.message || '加载更多评价失败'
    }
  }
}

function formatCommentDate(timestamp) {
  if (!timestamp) return '未知时间'
  const date = new Date(Number(timestamp) * 1000)
  if (Number.isNaN(date.getTime())) return '未知时间'
  const year = date.getFullYear()
  const month = String(date.getMonth() + 1).padStart(2, '0')
  const day = String(date.getDate()).padStart(2, '0')
  return `${year}-${month}-${day}`
}

function clonePlainObject(value) {
  if (!value || typeof value !== 'object') return value
  try {
    return JSON.parse(JSON.stringify(value))
  } catch {
    return null
  }
}

function sanitizeCourseForIpc(course, overrides = {}) {
  const courseId = getCourseId(course)
  const scoreStats = clonePlainObject(course?.scoreStats)
  return {
    courseId,
    md5Hash: courseId,
    lessonName: String(course?.lessonName || course?.courseName || '').trim(),
    courseName: String(course?.courseName || course?.lessonName || '').trim(),
    teacherName: String(course?.teacherName || '').trim(),
    courseType: getDisplayCourseType(course),
    starAvgTotal: course?.starAvgTotal ?? null,
    courseComment: course?.courseComment ?? null,
    scoreStats,
    courseTerm: String(course?.courseTerm || course?.term || '').trim(),
    term: String(course?.term || course?.courseTerm || '').trim(),
    hasScore: course?.hasScore === true,
    gradeState: String(course?.gradeState || '').trim(),
    gradeStatusText: String(course?.gradeStatusText || '').trim(),
    forceReadOnly: course?.forceReadOnly === true,
    hasEvaluationPermission: course?.hasEvaluationPermission === true,
    isEvaluated: course?.isEvaluated === true,
    ...overrides
  }
}

async function searchLinkeCourses() {
  const keyword = linkeCourseSearchKeyword.value.trim()
  if (!keyword || typeof desktop.searchLinkeCourses !== 'function') {
    return
  }
  if (
    linkeCourseSearchState.value.status === 'loading' &&
    String(linkeCourseSearchState.value.keyword || '').trim() === keyword
  ) {
    return
  }
  linkeCourseSearchState.value = {
    status: 'loading',
    message: '',
    keyword,
    courses: []
  }
  saveLinkeRecentKeyword(keyword)
  try {
    const result = await desktop.searchLinkeCourses({ keyword })
    linkeCourseSearchState.value = {
      status: 'ready',
      message: '',
      keyword: result?.keyword || keyword,
      courses: Array.isArray(result?.courses) ? result.courses : []
    }
  } catch (error) {
    linkeCourseSearchState.value = {
      status: 'error',
      message: error?.message || '搜索失败',
      keyword,
      courses: []
    }
  }
}

async function openLinkeCourseDetail(course, options = {}) {
  const courseId = getCourseId(course)
  if (!courseId || typeof desktop.getLinkeCourseDetail !== 'function') {
    return
  }
  const payload = sanitizeCourseForIpc(course, {
    hasEvaluationPermission: options.fromEvaluation === true || course?.hasEvaluationPermission === true,
    isEvaluated: course?.isEvaluated === true,
    forceReadOnly: options.forceReadOnly === true || course?.forceReadOnly === true
  })
  if (options.replace === true) {
    linkeAssistantView.value = 'detail'
  } else {
    openLinkeAssistantView('detail')
  }
  linkeDetailCommentFilter.value = 'all'
  linkeDetailCommentSort.value = 'likeDesc'
  linkeDetailFilterMenuOpen.value = false
  linkeDetailTermMenuOpen.value = false
  loadLinkeCollectionIds(false)
  linkeCourseDetailState.value = {
    status: 'loading',
    message: '',
    course: null,
    comments: [],
    commentCount: 0,
    rating: null,
    scoreStats: null,
    commentPage: 1,
    commentPageSize: 50,
    commentHasMore: false,
    commentLoadingMore: false,
    availableTerms: [],
    selectedTerm: ''
  }
  try {
    const result = await desktop.getLinkeCourseDetail(payload)
    const resultCourse = result?.course || payload
    if (resultCourse?.isCollected === true) {
      const next = new Set(linkeCollectedCourseIds.value)
      next.add(courseId)
      linkeCollectedCourseIds.value = next
    }
    linkeCourseDetailState.value = {
      status: 'ready',
      message: result?.detailError || '',
      course: resultCourse,
      comments: Array.isArray(result?.comments) ? result.comments : [],
      commentCount: Number(result?.commentCount || 0),
      rating: result?.rating || null,
      scoreStats: result?.scoreStats || result?.course?.scoreStats || payload.scoreStats || null,
      commentPage: Number(result?.commentPage || 1),
      commentPageSize: Number(result?.commentPageSize || 50),
      commentHasMore: result?.commentHasMore === true,
      commentLoadingMore: false,
      availableTerms: Array.isArray(result?.availableTerms) ? result.availableTerms : [],
      selectedTerm: result?.selectedTerm || resultCourse?.courseTerm || ''
    }
  } catch (error) {
    linkeCourseDetailState.value = {
      status: 'error',
      message: error?.message || '课程详情读取失败',
      course: null,
      comments: [],
      commentCount: 0,
      rating: null,
      scoreStats: null,
      commentPage: 1,
      commentPageSize: 50,
      commentHasMore: false,
      commentLoadingMore: false,
      availableTerms: [],
      selectedTerm: ''
    }
  }
}

function openLinkeEvaluatedActions(course) {
  if (!course?.isEvaluated) return
  linkeEvaluatedActionCourse.value = sanitizeCourseForIpc(course, {
    hasEvaluationPermission: true,
    isEvaluated: true
  })
}

function closeLinkeEvaluatedActions() {
  if (linkeDeleteActionLoading.value) return
  linkeEvaluatedActionCourse.value = null
}

function editLinkeEvaluatedCourse() {
  const course = linkeEvaluatedActionCourse.value
  linkeEvaluatedActionCourse.value = null
  if (course) {
    openLinkeReview(course, { edit: true })
  }
}

async function deleteLinkeEvaluatedCourse() {
  const course = linkeEvaluatedActionCourse.value
  const courseId = getCourseId(course)
  if (!courseId || typeof desktop.deleteLinkeCourseComment !== 'function' || linkeDeleteActionLoading.value) {
    return
  }
  const name = getCourseTitle(course)
  if (!window.confirm(`确定要删除对「${name}」的评价吗？删除后可在该课程详情页重新评价。`)) {
    closeLinkeEvaluatedActions()
    return
  }
  linkeDeleteActionLoading.value = true
  try {
    await desktop.deleteLinkeCourseComment({ courseId })
    linkeEvaluatedActionCourse.value = null
    await refreshJwEvaluationCourses()
    if (linkeDetailCourse.value && getCourseId(linkeDetailCourse.value) === courseId) {
      await openLinkeCourseDetail(sanitizeCourseForIpc(linkeDetailCourse.value, { isEvaluated: false }), {
        fromEvaluation: true,
        replace: true
      })
    }
  } catch (error) {
    const raw = String(error?.message || '')
    if (raw.includes('未找到该课程评价') || raw.includes('CourseComment Not Found')) {
      linkeEvaluatedActionCourse.value = null
      await refreshJwEvaluationCourses()
      return
    }
    jwEvaluationState.value = {
      ...jwEvaluationState.value,
      message: error?.message || '删除评价失败'
    }
  } finally {
    linkeDeleteActionLoading.value = false
  }
}

async function openLinkeReview(course, options = {}) {
  const editMode = options.edit === true
  if (!course || !course.hasEvaluationPermission || (!editMode && course.isEvaluated)) {
    return
  }
  linkeReviewCourse.value = course
  linkeReviewMode.value = editMode ? 'edit' : 'create'
  linkeReviewForm.value = {
    commentStar1: 0,
    commentStar2: 0,
    commentStar3: 0,
    commentMessage: ''
  }
  linkeReviewState.value = {
    status: editMode ? 'loading' : 'idle',
    message: editMode ? '正在读取已提交评价...' : ''
  }
  openLinkeAssistantView('review')
  if (editMode) {
    await loadLinkeReviewDraft(course)
  }
}

async function loadLinkeReviewDraft(course) {
  if (typeof desktop.getMyLinkeCourseComment !== 'function') {
    linkeReviewState.value = {
      status: 'error',
      message: '当前版本暂不支持读取已提交评价'
    }
    return
  }
  try {
    const result = await desktop.getMyLinkeCourseComment({ courseId: getCourseId(course) })
    const comment = result?.comment || {}
    linkeReviewForm.value = {
      commentStar1: Number(comment.commentStar1 || 0),
      commentStar2: Number(comment.commentStar2 || 0),
      commentStar3: Number(comment.commentStar3 || 0),
      commentMessage: String(comment.commentMessage || '')
    }
    linkeReviewState.value = {
      status: 'idle',
      message: ''
    }
  } catch (error) {
    linkeReviewState.value = {
      status: 'error',
      message: error?.message || '读取已提交评价失败'
    }
  }
}

async function submitLinkeReview() {
  const submitter = linkeReviewMode.value === 'edit'
    ? desktop.updateLinkeCourseComment
    : desktop.submitLinkeCourseComment
  if (!linkeReviewFormReady.value || linkeReviewSubmitting.value || typeof submitter !== 'function') {
    return
  }
  const course = linkeReviewCourse.value
  linkeReviewSubmitting.value = true
  linkeReviewState.value = {
    status: 'loading',
    message: '正在提交评价...'
  }
  try {
    await submitter({
      courseId: getCourseId(course),
      commentStar1: linkeReviewForm.value.commentStar1,
      commentStar2: linkeReviewForm.value.commentStar2,
      commentStar3: linkeReviewForm.value.commentStar3,
      commentMessage: linkeReviewForm.value.commentMessage.trim()
    })
    linkeReviewState.value = {
      status: 'success',
      message: linkeReviewMode.value === 'edit' ? '评价修改成功' : '评价提交成功'
    }
    await refreshJwEvaluationCourses()
    await openLinkeCourseDetail(sanitizeCourseForIpc(course, { isEvaluated: true }), { fromEvaluation: true, replace: true })
  } catch (error) {
    linkeReviewState.value = {
      status: 'error',
      message: error?.message || '提交失败'
    }
  } finally {
    linkeReviewSubmitting.value = false
  }
}

function toggleEmptyFavoriteNavigation(event) {
  if (!isFavoriteNavigationEmpty.value) {
    return
  }

  event.preventDefault()
  emptyFavoriteNavigationExpanded.value = !emptyFavoriteNavigationExpanded.value
}

function setAllJwNavigationFoldersExpanded(expanded) {
  emptyFavoriteNavigationExpanded.value = false

  const panel = document.querySelector('.jw-navigation-panel')
  if (!panel) {
    return
  }

  panel
    .querySelectorAll('details.jw-navigation-favorite-group:not(.empty), details.jw-navigation-group, details.jw-navigation-subgroup')
    .forEach((node) => {
      node.open = expanded
    })
}

function getNavigationItemLevel(item) {
  const rawLevel = Number.parseInt(item?.level, 10)
  if (!Number.isFinite(rawLevel)) {
    return 0
  }
  return Math.max(0, Math.min(3, rawLevel))
}

function getJwNavigationGroupIconKey(group) {
  if (group?.kind === 'favorites') {
    return 'favorite'
  }

  const title = normalizeNavigationTitleKey(group?.title)
  if (title.includes('收藏')) {
    return 'favorite'
  }
  if (title.includes('桌面')) {
    return 'desktop'
  }
  if (title.includes('学籍') || title.includes('成绩')) {
    return 'student'
  }
  if (title.includes('培养') || title.includes('选课')) {
    return 'cultivation'
  }
  if (title.includes('考试') || title.includes('报名')) {
    return 'exam'
  }
  if (title.includes('实践')) {
    return 'practice'
  }
  if (title.includes('评价')) {
    return 'evaluation'
  }
  if (title.includes('交流') || title.includes('申请')) {
    return 'exchange'
  }
  return 'folder'
}

function getJwNavigationGroupIconPaths(group) {
  return jwNavigationGroupIconPathMap[getJwNavigationGroupIconKey(group)] || jwNavigationGroupIconPathMap.folder
}

function createJwNavigationTree(items) {
  const roots = []
  const stack = []

  items.forEach((item, itemIndex) => {
    const level = getNavigationItemLevel(item)
    const node = {
      item,
      itemIndex,
      level,
      children: []
    }

    while (stack.length > 0 && stack[stack.length - 1].level >= level) {
      stack.pop()
    }

    const parent = stack[stack.length - 1]
    if (parent) {
      parent.children.push(node)
    } else {
      roots.push(node)
    }

    stack.push(node)
  })

  return roots
}

function getNavigationNodeDescendants(node) {
  const descendants = []
  const visit = (children) => {
    for (const child of Array.isArray(children) ? children : []) {
      descendants.push(child)
      visit(child.children)
    }
  }
  visit(node?.children)
  return descendants
}

function getVisibleNavigationTree(section) {
  return (Array.isArray(section?.tree) ? section.tree : [])
    .filter((node) => !isBranchlessSecondLevelNavigationItem(section, node.item, node.itemIndex))
}

function isBranchlessSecondLevelNavigationItem(group, item, itemIndex) {
  return getNavigationItemLevel(item) === 0 && !hasJwNavigationChildItem(group, item, itemIndex)
}

function isJwNavigationItemDisabled(group, item, itemIndex) {
  if (hasJwNavigationChildItem(group, item, itemIndex)) {
    return true
  }
  if (item?.disabled === true) {
    return true
  }
  if (item?.disabled === false) {
    return false
  }

  const items = Array.isArray(group?.items) ? group.items : []
  const level = getNavigationItemLevel(item)
  const next = items[itemIndex + 1]
  return level === 0 && (!next || getNavigationItemLevel(next) <= level)
}

function hasJwNavigationChildItem(group, item, itemIndex) {
  const items = Array.isArray(group?.items) ? group.items : []
  const level = getNavigationItemLevel(item)
  const next = items[itemIndex + 1]
  return !!next && getNavigationItemLevel(next) > level
}

function isJwNavigationItemFavorite(item) {
  return favoriteNavigationIds.value.has(String(item?.id || ''))
}

function isJwNavigationItemFavoriteable(group, item, itemIndex) {
  if (isJwNavigationItemDisabled(group, item, itemIndex)) {
    return false
  }
  if (item?.source === 'favorite') {
    return true
  }
  if (item?.id === personalCenterNavigationItem.id) {
    return false
  }
  return getNavigationItemLevel(item) >= 1
}

function getNavigationItemContext(item) {
  return String(item?.contextTitle || '').trim()
}

function getJwNavigationBreadcrumb(group, item, itemIndex) {
  if (Array.isArray(item?.breadcrumbTitles) && item.breadcrumbTitles.length > 0) {
    return item.breadcrumbTitles
      .map((value) => normalizeJwHomeTitle(value))
      .filter(Boolean)
  }

  const items = Array.isArray(group?.items) ? group.items : []
  const currentLevel = getNavigationItemLevel(item)
  const ancestors = []
  let expectedLevel = currentLevel - 1

  for (let index = itemIndex - 1; index >= 0 && expectedLevel >= 0; index -= 1) {
    const candidate = items[index]
    const candidateLevel = getNavigationItemLevel(candidate)
    if (candidateLevel <= expectedLevel) {
      const title = String(candidate?.title || '').trim()
      if (title) {
        ancestors.unshift(title)
      }
      expectedLevel = candidateLevel - 1
    }
  }

  return [
    group?.title || '',
    ...ancestors,
    item?.title || ''
  ].map((value) => String(value || '').trim()).filter(Boolean)
}

async function openJwNavigationItem(group, item, itemIndex) {
  if (!item?.id || isJwNavigationItemDisabled(group, item, itemIndex)) {
    return
  }
  if (item.id === personalCenterNavigationItem.id) {
    await openPersonalCenterNavigation()
    return
  }

  const breadcrumbTitles = getJwNavigationBreadcrumb(group, item, itemIndex)
  const groupTitle = item.groupTitle || breadcrumbTitles[0] || group?.title || ''
  const parentTitle = item.parentTitle || (breadcrumbTitles.length > 2 ? breadcrumbTitles[breadcrumbTitles.length - 2] : '')
  activeNavigationItemId.value = item.id
  await desktop.openJwNavigationItem({
    id: item.id,
    title: item.title,
    groupTitle,
    parentTitle,
    breadcrumbTitles
  })
}

async function toggleJwNavigationFavorite(group, item, itemIndex) {
  if (!item?.id || !isJwNavigationItemFavoriteable(group, item, itemIndex)) {
    return
  }
  applyJwNavigationFavorites(await desktop.toggleJwNavigationFavorite({
    id: item.id,
    title: item.title,
    groupTitle: item.groupTitle || group?.title || ''
  }))
}

async function openPersonalCenterNavigation() {
  activeNavigationItemId.value = personalCenterNavigationItem.id
  await desktop.openJwNavigationItem({
    id: personalCenterNavigationItem.id,
    title: personalCenterNavigationItem.title,
    groupTitle: personalCenterNavigationItem.title,
    breadcrumbTitles: [personalCenterNavigationItem.title]
  })
}

async function showOriginalJwPage() {
  closeJwNavigationSettings()
  if (typeof desktop.setJwOriginalMode === 'function') {
    applyBrowserState(await desktop.setJwOriginalMode(true))
  }
}

async function logoutJw() {
  closeJwNavigationSettings()
  if (typeof desktop.logoutJw === 'function') {
    applyBrowserState(await desktop.logoutJw())
    jwEvaluationState.value = createInitialJwEvaluationState()
  }
}

async function setActiveFeature(key) {
  const nextKey = normalizeFeatureKey(key)
  if (activeFeature.value === nextKey) {
    return
  }

  const requestId = ++activeFeatureRequestId
  try {
    const state = await desktop.setActiveFeature(nextKey)
    if (requestId === activeFeatureRequestId) {
      applyBrowserState(state)
    }
  } catch {
    // Keep the current view stable if the target page cannot be activated.
  }
}

function normalizeFeatureKey(key) {
  return featureItems.some((feature) => feature.key === key) ? key : 'browser'
}

function clearClientTextSelection() {
  window.getSelection()?.removeAllRanges()
}

let unsubscribers = []

watch(activeFeature, (feature) => {
  const shouldNotifyMain = activeFeatureSyncSource !== 'browser-state'
  activeFeatureSyncSource = ''
  window.localStorage.setItem('linke.activeFeature', feature)
  if (shouldNotifyMain) {
    desktop.setActiveFeature(feature).catch(() => {})
  }
}, { immediate: true })

watch(jwNavigationCollapsed, (collapsed) => {
  window.localStorage.setItem('linke.jwNavigationCollapsed', collapsed ? '1' : '0')
})

watch(jwAgentPanelOpen, (open) => {
  window.localStorage.setItem('linke.jwAgentPanelOpen', open ? '1' : '0')
})

watch(showJwAgentPanel, (visible) => {
  if (visible) {
    loadLinkeCollections(false)
  }
}, { immediate: true })

watch(showJwNavigationPanel, (visible) => {
  if (!visible) {
    closeJwNavigationSettings()
  }
})

watch(() => browserState.value.url, () => {
  if (showJwAgentPanel.value) {
    loadLinkeCollections(false)
  }
})

watch(isFavoriteNavigationEmpty, (empty) => {
  if (!empty) {
    emptyFavoriteNavigationExpanded.value = false
  }
})

watch([
  showJwShellControls,
  jwNavigationCollapsed,
  jwAgentPanelOpen
], syncJwShellLayout, { immediate: true })

onMounted(async () => {
  applyBrowserState(await desktop.getBrowserState())
  applyJwNavigationCatalog(await desktop.getJwNavigation())
  applyJwNavigationFavorites(await desktop.getJwNavigationFavorites())
  await hydrateJwEvaluationSnapshot()

  unsubscribers = [
    desktop.onBrowserState(applyBrowserState),
    desktop.onJwNavigation(applyJwNavigationCatalog),
    desktop.onJwCaptchaStatus((payload) => {
      captchaStatus.value = payload || { status: 'idle', message: '等待登录页' }
    }),
    desktop.onJwCredentialStatus((payload) => {
      credentialStatus.value = payload || { status: 'idle', message: '等待登录页' }
      if (payload?.status === 'saved') {
        hydrateJwEvaluationSnapshot()
        loadLinkeCollectionIds(true)
      }
    }),
    desktop.onJwMyCoursesProgress(applyLinkeMyCoursesProgress),
    typeof desktop.onLinkeDatabaseSearchRequest === 'function'
      ? desktop.onLinkeDatabaseSearchRequest((payload = {}) => {
          openLinkeDatabaseSearch(payload.keyword).catch(() => {})
        })
      : () => {}
  ]
  loadLinkeCollectionIds(false)
})

onUnmounted(() => {
  for (const unsubscribe of unsubscribers) {
    unsubscribe()
  }
})
</script>
