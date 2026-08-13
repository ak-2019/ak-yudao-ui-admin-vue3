<template>
  <div v-if="dashboard" class="decision-workbench">
    <template v-if="mode === 'overview'">
      <section class="workbench-section workbench-section--lead">
        <div class="section-heading">
          <div>
            <h2>决策摘要</h2>
            <span>{{ dashboard.calculationVersion || '历史口径' }}</span>
          </div>
          <div class="version-tags">
            <el-tag effect="plain" size="small">{{ dashboard.promptVersion }}</el-tag>
            <el-tag :type="qualityTagType" effect="plain" size="small">
              数据质量 {{ dashboard.dataQuality.score }}
            </el-tag>
          </div>
        </div>

        <div class="summary-grid">
          <div class="summary-cell summary-cell--primary">
            <span>账户相对基准</span>
            <strong :class="changeClass(dashboard.performance.excessReturn)">
              {{ formatPercent(dashboard.performance.excessReturn) }}
            </strong>
            <small>{{ dashboard.performance.primaryBenchmarkName || '适配基准' }}</small>
          </div>
          <div class="summary-cell">
            <span>五维有效均分</span>
            <strong>{{ formatNumber(decisionScoreAverage) }}</strong>
            <small>{{ scoreableDimensionCount }}/5 个维度可评分</small>
          </div>
          <div class="summary-cell">
            <span>最大正贡献</span>
            <strong class="positive-number">{{
              formatAmount(largestPositiveDecision?.impactAmount)
            }}</strong>
            <small>{{ decisionStockLabel(largestPositiveDecision) }}</small>
          </div>
          <div class="summary-cell">
            <span>最大负贡献</span>
            <strong class="negative-number">{{
              formatAmount(largestNegativeDecision?.impactAmount)
            }}</strong>
            <small>{{ decisionStockLabel(largestNegativeDecision) }}</small>
          </div>
          <div class="summary-cell">
            <span>可审计回合</span>
            <strong>{{ decisionCoverage.episodeCount }}</strong>
            <small>{{ decisionCoverage.scoreableEpisodeCount }} 个可计算净盈亏</small>
          </div>
          <div class="summary-cell">
            <span>平均数据覆盖</span>
            <strong>{{ formatPercent(decisionCoverage.averageCoverageRate) }}</strong>
            <small>基准节点 {{ formatPercent(decisionCoverage.benchmarkNodeCoverageRate) }}</small>
          </div>
          <div class="summary-cell">
            <span>最大浮盈回吐</span>
            <strong class="negative-number">{{ formatAmount(maxProfitGiveback) }}</strong>
            <small>交易回合峰值至最终结果</small>
          </div>
          <div class="summary-cell">
            <span>风险 / 数据缺口</span>
            <strong>{{ dashboard.risks.length }} / {{ decisionCoverage.issues.length }}</strong>
            <small>{{ dashboard.dataQuality.missingMarketStockCount }} 只股票缺行情</small>
          </div>
        </div>
      </section>

      <section class="workbench-section chart-grid">
        <div class="chart-block">
          <div class="section-heading section-heading--compact">
            <div><h3>五维能力</h3><span>系统评分与样本状态</span></div>
          </div>
          <Echart :height="290" :options="decisionQualityOptions" />
        </div>
        <div class="chart-block">
          <div class="section-heading section-heading--compact">
            <div><h3>收益归因</h3><span>现金流不计入投资收益</span></div>
          </div>
          <Echart :height="290" :options="attributionOptions" />
        </div>
      </section>

      <section class="workbench-section">
        <div class="section-heading">
          <div><h3>关键决策</h3><span>按实际净盈亏绝对值排序</span></div>
        </div>
        <el-table
          :data="dashboard.keyDecisions || []"
          stripe
          table-layout="fixed"
          empty-text="暂无可审计关键决策"
        >
          <el-table-column prop="type" label="结果" width="92" sortable>
            <template #default="{ row }">
              <el-tag :type="decisionTagType(row.type)" size="small" effect="plain">
                {{ decisionTypeLabel(row.type) }}
              </el-tag>
            </template>
          </el-table-column>
          <el-table-column prop="stockId" label="股票" min-width="150" sortable>
            <template #default="{ row }">{{ stockLabel(row.stockId) }}</template>
          </el-table-column>
          <el-table-column prop="impactAmount" label="实际影响" width="118" align="right" sortable>
            <template #default="{ row }">
              <span :class="changeClass(row.impactAmount)">{{
                formatAmount(row.impactAmount)
              }}</span>
            </template>
          </el-table-column>
          <el-table-column prop="impactRate" label="回合收益" width="108" align="right" sortable>
            <template #default="{ row }">{{ formatPercent(row.impactRate) }}</template>
          </el-table-column>
          <el-table-column
            prop="excessReturnRate"
            label="基准超额"
            width="108"
            align="right"
            sortable
          >
            <template #default="{ row }">
              <span :class="changeClass(row.excessReturnRate)">{{
                formatPercent(row.excessReturnRate)
              }}</span>
            </template>
          </el-table-column>
          <el-table-column prop="summary" label="决策结论" min-width="300" show-overflow-tooltip />
          <el-table-column label="证据" width="92" fixed="right">
            <template #default="{ row }">
              <el-button link type="primary" @click="openDecisionEvidence(row)">查看</el-button>
            </template>
          </el-table-column>
        </el-table>
      </section>
    </template>

    <template v-else-if="mode === 'episodes'">
      <section class="workbench-section">
        <div class="section-heading">
          <div><h2>交易回合</h2><span>FIFO 成本轨迹与区间成交边界</span></div>
          <div class="table-tools">
            <el-input
              v-model="episodeKeyword"
              clearable
              placeholder="股票代码或名称"
              :prefix-icon="Search"
            />
            <el-select v-model="episodeStatusFilter" clearable placeholder="回合状态">
              <el-option
                v-for="item in episodeStatusOptions"
                :key="item.value"
                :label="item.label"
                :value="item.value"
              />
            </el-select>
            <el-select v-model="episodeDecisionFilter" clearable placeholder="贡献方向">
              <el-option label="正贡献" value="POSITIVE" />
              <el-option label="负贡献" value="NEGATIVE" />
              <el-option label="中性" value="NEUTRAL" />
            </el-select>
          </div>
        </div>
        <el-table :data="filteredEpisodeRows" stripe border table-layout="fixed" max-height="650">
          <el-table-column type="expand" width="44">
            <template #default="{ row }">
              <div class="episode-expand">
                <el-table
                  :data="episodeFillRows(row)"
                  size="small"
                  table-layout="fixed"
                  empty-text="无成交节点"
                >
                  <el-table-column prop="tradeDate" label="日期" width="110" sortable />
                  <el-table-column prop="side" label="方向" width="82" sortable>
                    <template #default="{ row: fill }">{{
                      fill.side === 'BUY' ? '买入' : '卖出'
                    }}</template>
                  </el-table-column>
                  <el-table-column prop="price" label="成交价" width="100" align="right" sortable>
                    <template #default="{ row: fill }">{{ formatPrice(fill.price) }}</template>
                  </el-table-column>
                  <el-table-column prop="quantity" label="数量" width="100" align="right" sortable>
                    <template #default="{ row: fill }">{{
                      formatQuantity(fill.quantity)
                    }}</template>
                  </el-table-column>
                  <el-table-column
                    prop="positionQuantityAfter"
                    label="成交后持仓"
                    width="120"
                    align="right"
                    sortable
                  >
                    <template #default="{ row: fill }">{{
                      formatQuantity(fill.positionQuantityAfter)
                    }}</template>
                  </el-table-column>
                  <el-table-column label="1日" width="88" align="right">
                    <template #default="{ row: fill }">{{ formatPercent(fill.horizon1) }}</template>
                  </el-table-column>
                  <el-table-column label="3日" width="88" align="right">
                    <template #default="{ row: fill }">{{ formatPercent(fill.horizon3) }}</template>
                  </el-table-column>
                  <el-table-column label="5日" width="88" align="right">
                    <template #default="{ row: fill }">{{ formatPercent(fill.horizon5) }}</template>
                  </el-table-column>
                  <el-table-column label="10日" width="88" align="right">
                    <template #default="{ row: fill }">{{
                      formatPercent(fill.horizon10)
                    }}</template>
                  </el-table-column>
                  <el-table-column
                    prop="evidenceId"
                    label="证据"
                    min-width="150"
                    show-overflow-tooltip
                  />
                </el-table>
              </div>
            </template>
          </el-table-column>
          <el-table-column prop="stockName" label="股票" min-width="160" fixed sortable>
            <template #default="{ row }"
              ><strong>{{ row.stockName }}</strong
              ><small class="cell-subtitle">{{ row.stockCode }}</small></template
            >
          </el-table-column>
          <el-table-column prop="status" label="状态" width="102" sortable>
            <template #default="{ row }"
              ><el-tag :type="episodeStatusTag(row.status)" size="small" effect="plain">{{
                episodeStatusLabel(row.status)
              }}</el-tag></template
            >
          </el-table-column>
          <el-table-column prop="beginDate" label="开始" width="108" sortable />
          <el-table-column prop="endDate" label="结束" width="108" sortable>
            <template #default="{ row }">{{ row.endDate || '持有中' }}</template>
          </el-table-column>
          <el-table-column
            prop="analysisTradeCount"
            label="区间成交"
            width="106"
            align="right"
            sortable
          />
          <el-table-column prop="netProfitLoss" label="净盈亏" width="118" align="right" sortable>
            <template #default="{ row }"
              ><span :class="changeClass(row.netProfitLoss)">{{
                formatAmount(row.netProfitLoss)
              }}</span></template
            >
          </el-table-column>
          <el-table-column
            prop="episodeReturnRate"
            label="回合收益"
            width="108"
            align="right"
            sortable
          >
            <template #default="{ row }">{{ formatPercent(row.episodeReturnRate) }}</template>
          </el-table-column>
          <el-table-column
            prop="excessReturnRate"
            label="基准超额"
            width="108"
            align="right"
            sortable
          >
            <template #default="{ row }"
              ><span :class="changeClass(row.excessReturnRate)">{{
                formatPercent(row.excessReturnRate)
              }}</span></template
            >
          </el-table-column>
          <el-table-column prop="mfeRate" label="MFE" width="92" align="right" sortable>
            <template #default="{ row }">{{ formatPercent(row.mfeRate) }}</template>
          </el-table-column>
          <el-table-column prop="maeRate" label="MAE" width="92" align="right" sortable>
            <template #default="{ row }">{{ formatPercent(row.maeRate) }}</template>
          </el-table-column>
          <el-table-column
            prop="maxProfitGivebackAmount"
            label="浮盈回吐"
            width="110"
            align="right"
            sortable
          >
            <template #default="{ row }">{{ formatAmount(row.maxProfitGivebackAmount) }}</template>
          </el-table-column>
          <el-table-column prop="coverageRate" label="覆盖率" width="96" align="right" sortable>
            <template #default="{ row }">{{ formatPercent(row.coverageRate) }}</template>
          </el-table-column>
          <el-table-column label="证据" width="92" fixed="right">
            <template #default="{ row }"
              ><el-button link type="primary" @click="openEpisodeEvidence(row)"
                >查看</el-button
              ></template
            >
          </el-table-column>
        </el-table>
      </section>
    </template>

    <template v-else-if="mode === 'stocks'">
      <section class="workbench-section">
        <div class="section-heading">
          <div><h2>逐股表现</h2><span>行情表现、仓位与交易行为</span></div>
        </div>
        <el-table :data="dashboard.stocks" stripe border table-layout="fixed" max-height="650">
          <el-table-column prop="name" label="股票" min-width="150" fixed sortable>
            <template #default="{ row }"
              ><strong>{{ row.name }}</strong
              ><small class="cell-subtitle">{{ row.market }}:{{ row.code }}</small></template
            >
          </el-table-column>
          <el-table-column
            prop="industry"
            label="行业"
            min-width="110"
            sortable
            show-overflow-tooltip
          />
          <el-table-column prop="holding" label="状态" width="88" sortable>
            <template #default="{ row }"
              ><el-tag :type="row.holding ? 'success' : 'info'" size="small" effect="plain">{{
                row.holding ? '持仓' : '已交易'
              }}</el-tag></template
            >
          </el-table-column>
          <el-table-column prop="positionRatio" label="仓位" width="92" align="right" sortable
            ><template #default="{ row }">{{
              formatPercent(row.positionRatio)
            }}</template></el-table-column
          >
          <el-table-column prop="periodChange" label="周期涨跌" width="110" align="right" sortable
            ><template #default="{ row }"
              ><span :class="changeClass(row.periodChange)">{{
                formatPercent(row.periodChange)
              }}</span></template
            ></el-table-column
          >
          <el-table-column prop="benchmarkChange" label="基准" width="100" align="right" sortable
            ><template #default="{ row }">{{
              formatPercent(row.benchmarkChange)
            }}</template></el-table-column
          >
          <el-table-column prop="excessReturn" label="超额" width="100" align="right" sortable
            ><template #default="{ row }"
              ><span :class="changeClass(row.excessReturn)">{{
                formatPercent(row.excessReturn)
              }}</span></template
            ></el-table-column
          >
          <el-table-column prop="maxDrawdown" label="最大回撤" width="110" align="right" sortable
            ><template #default="{ row }">{{
              formatPercent(row.maxDrawdown)
            }}</template></el-table-column
          >
          <el-table-column
            prop="holdingProfitLoss"
            label="持有盈亏"
            width="112"
            align="right"
            sortable
            ><template #default="{ row }">{{
              formatAmount(row.holdingProfitLoss)
            }}</template></el-table-column
          >
          <el-table-column prop="tradeCount" label="交易笔数" width="100" align="right" sortable />
          <el-table-column
            prop="chaseBuyCount"
            label="追涨买入"
            width="104"
            align="right"
            sortable
          />
          <el-table-column
            prop="panicSellCount"
            label="下跌卖出"
            width="104"
            align="right"
            sortable
          />
          <el-table-column
            prop="technicalSummary"
            label="技术状态"
            min-width="300"
            show-overflow-tooltip
          />
        </el-table>
      </section>
    </template>

    <template v-else-if="mode === 'attribution'">
      <section class="workbench-section">
        <div class="section-heading">
          <div
            ><h2>收益归因</h2
            ><span>{{ attribution?.calculationVersion || '暂无归因口径' }}</span></div
          >
          <el-tag :type="reconciliationTagType" effect="plain"
            >对账差额 {{ formatAmount(attribution?.reconciliationDifference) }}</el-tag
          >
        </div>
        <div class="attribution-summary">
          <div
            ><span>投资净盈亏</span
            ><strong :class="changeClass(attribution?.totalProfitLoss)">{{
              formatAmount(attribution?.totalProfitLoss)
            }}</strong></div
          >
          <div
            ><span>已解释盈亏</span
            ><strong>{{ formatAmount(attribution?.explainedProfitLoss) }}</strong></div
          >
          <div
            ><span>外部现金流</span
            ><strong>{{ formatAmount(attribution?.cashFlowAmount) }}</strong></div
          >
          <div
            ><span>归因项</span><strong>{{ attributionItems.length }}</strong></div
          >
        </div>
      </section>
      <section class="workbench-section">
        <div class="section-heading">
          <div>
            <h3>计划与实际</h3>
            <span>只把首次成交前已保存且未事后改写的结构化字段计入纪律评分</span>
          </div>
          <div class="audit-legend">
            <el-tag type="success" size="small" effect="plain">系统确定性</el-tag>
            <el-tag type="warning" size="small" effect="plain">AI 低置信度解释</el-tag>
          </div>
        </div>
        <el-table
          :data="planAuditRows"
          stripe
          border
          table-layout="fixed"
          empty-text="暂无交易计划审计；没有事前计划时纪律维度保持不可评分"
        >
          <el-table-column type="expand" width="44">
            <template #default="{ row }">
              <div class="plan-audit-expand">
                <div class="audit-source-heading">
                  <div>
                    <strong>系统确定性检查</strong>
                    <span>仅比较可验证的结构化计划字段与实际成交事实</span>
                  </div>
                  <el-tag type="success" size="small" effect="plain">SYSTEM</el-tag>
                </div>
                <el-table
                  :data="row.checks"
                  size="small"
                  table-layout="fixed"
                  empty-text="没有可检查的结构化字段"
                >
                  <el-table-column prop="field" label="检查项" width="132">
                    <template #default="{ row: check }">{{ planCheckLabel(check.field) }}</template>
                  </el-table-column>
                  <el-table-column prop="status" label="判定" width="104">
                    <template #default="{ row: check }">
                      <el-tag :type="planCheckTag(check.status)" size="small" effect="plain">
                        {{ planCheckStatusLabel(check.status) }}
                      </el-tag>
                    </template>
                  </el-table-column>
                  <el-table-column prop="plannedValue" label="计划" min-width="130" />
                  <el-table-column prop="actualValue" label="实际" min-width="130" />
                  <el-table-column
                    prop="explanation"
                    label="判定依据"
                    min-width="290"
                    show-overflow-tooltip
                  />
                </el-table>

                <template v-if="row.aiInterpretationFacts.length">
                  <div class="audit-source-heading audit-source-heading--ai">
                    <div>
                      <strong>AI 解释事实</strong>
                      <span>自由文本不进入确定性评分，报告只能以低置信度解释</span>
                    </div>
                    <el-tag type="warning" size="small" effect="plain">AI / LOW</el-tag>
                  </div>
                  <el-table :data="row.aiInterpretationFacts" size="small" table-layout="fixed">
                    <el-table-column prop="field" label="字段" width="132">
                      <template #default="{ row: fact }">{{ planCheckLabel(fact.field) }}</template>
                    </el-table-column>
                    <el-table-column prop="content" label="用户记录" min-width="260" />
                    <el-table-column
                      prop="warning"
                      label="使用边界"
                      min-width="280"
                      show-overflow-tooltip
                    />
                    <el-table-column prop="evidenceId" label="证据" min-width="190" />
                  </el-table>
                </template>
              </div>
            </template>
          </el-table-column>
          <el-table-column prop="stockName" label="股票" min-width="150" sortable>
            <template #default="{ row }">
              <strong>{{ row.stockName }}</strong>
              <span class="cell-subtitle">{{ row.stockCode }}</span>
            </template>
          </el-table-column>
          <el-table-column prop="establishedTime" label="计划建立" width="168" sortable>
            <template #default="{ row }">{{ formatDateTime(row.establishedTime) }}</template>
          </el-table-column>
          <el-table-column prop="firstTradeTime" label="首次成交" width="168" sortable>
            <template #default="{ row }">{{ formatDateTime(row.firstTradeTime) }}</template>
          </el-table-column>
          <el-table-column label="证据可信度" width="142">
            <template #default="{ row }">
              <el-tag :type="planTrustTag(row)" size="small" effect="plain">
                {{ planTrustLabel(row) }}
              </el-tag>
              <span v-if="row.planModifiedTime" class="cell-subtitle">
                计划修改 {{ formatDateTime(row.planModifiedTime) }}
              </span>
            </template>
          </el-table-column>
          <el-table-column label="遵守 / 违反 / 未判断" width="172" align="center">
            <template #default="{ row }">
              <span class="audit-count audit-count--adhered">{{ row.adheredCount }}</span>
              <span class="audit-count audit-count--violated">{{ row.violatedCount }}</span>
              <span class="audit-count">{{ row.notJudgableCount }}</span>
            </template>
          </el-table-column>
          <el-table-column prop="adherenceRate" label="遵守率" width="106" align="right" sortable>
            <template #default="{ row }">{{ formatPercent(row.adherenceRate) }}</template>
          </el-table-column>
          <el-table-column
            prop="coverageRate"
            label="可判断覆盖"
            width="116"
            align="right"
            sortable
          >
            <template #default="{ row }">{{ formatPercent(row.coverageRate) }}</template>
          </el-table-column>
          <el-table-column label="证据" width="84" fixed="right">
            <template #default="{ row }">
              <el-button link type="primary" @click="openPlanAuditEvidence(row)">查看</el-button>
            </template>
          </el-table-column>
        </el-table>
      </section>
      <section class="workbench-section chart-grid">
        <div class="chart-block"><Echart :height="330" :options="attributionOptions" /></div>
        <div class="chart-block">
          <el-table
            :data="attributionItems"
            stripe
            table-layout="fixed"
            max-height="330"
            empty-text="暂无收益归因"
          >
            <el-table-column prop="category" label="归因" min-width="120" sortable
              ><template #default="{ row }">{{
                attributionCategoryLabel(row.category)
              }}</template></el-table-column
            >
            <el-table-column prop="status" label="状态" width="96" sortable
              ><template #default="{ row }"
                ><el-tag :type="attributionStatusTag(row.status)" size="small" effect="plain">{{
                  attributionStatusLabel(row.status)
                }}</el-tag></template
              ></el-table-column
            >
            <el-table-column prop="amount" label="金额" width="110" align="right" sortable
              ><template #default="{ row }"
                ><span :class="changeClass(row.amount)">{{
                  formatAmount(row.amount)
                }}</span></template
              ></el-table-column
            >
            <el-table-column prop="proportion" label="占比" width="92" align="right" sortable
              ><template #default="{ row }">{{
                formatPercent(row.proportion)
              }}</template></el-table-column
            >
            <el-table-column
              prop="explanation"
              label="口径"
              min-width="250"
              show-overflow-tooltip
            />
          </el-table>
        </div>
      </section>
      <section v-if="attribution?.issues?.length" class="workbench-section issue-list">
        <el-alert
          v-for="issue in attribution.issues"
          :key="issue"
          :title="issue"
          type="warning"
          :closable="false"
          show-icon
        />
      </section>
    </template>

    <template v-else>
      <section class="workbench-section">
        <div class="section-heading"
          ><div><h2>纪律与数据</h2><span>评分状态、行为信号和证据完整度</span></div></div
        >
        <div class="dimension-grid">
          <div
            v-for="dimension in decisionDimensions"
            :key="dimension.dimension"
            class="dimension-cell"
          >
            <div class="dimension-title"
              ><span>{{ dimensionLabel(dimension.dimension) }}</span
              ><el-tag :type="dimensionStatusTag(dimension.status)" size="small" effect="plain">{{
                dimensionStatusLabel(dimension.status)
              }}</el-tag></div
            >
            <strong>{{ formatNumber(dimension.score) }}</strong>
            <small
              >样本 {{ dimension.sampleCount }} · 覆盖
              {{ formatPercent(dimension.coverageRate) }}</small
            >
            <p>{{
              dimension.negativeFactors?.[0] || dimension.positiveFactors?.[0] || '暂无因素'
            }}</p>
          </div>
        </div>
      </section>
      <section class="workbench-section chart-grid">
        <div>
          <div class="section-heading section-heading--compact"
            ><div><h3>行为信号</h3><span>仅统计可验证成交行为</span></div></div
          >
          <div class="behavior-grid">
            <div
              ><span>买入</span><strong>{{ dashboard.trades.buyCount }}</strong></div
            >
            <div
              ><span>卖出</span><strong>{{ dashboard.trades.sellCount }}</strong></div
            >
            <div
              ><span>追涨买入</span
              ><strong class="negative-number">{{ dashboard.trades.chaseBuyCount }}</strong></div
            >
            <div
              ><span>下跌卖出</span
              ><strong class="negative-number">{{ dashboard.trades.panicSellCount }}</strong></div
            >
            <div
              ><span>同日回转</span
              ><strong>{{ dashboard.trades.sameDayRoundTripCount }}</strong></div
            >
            <div
              ><span>交易费用</span
              ><strong>{{ formatAmount(dashboard.trades.totalFee) }}</strong></div
            >
          </div>
          <el-table
            class="risk-table"
            :data="dashboard.risks"
            stripe
            table-layout="fixed"
            max-height="300"
            empty-text="暂无规则风险信号"
          >
            <el-table-column prop="level" label="等级" width="86"
              ><template #default="{ row }"
                ><el-tag :type="riskTagType(row.level)" size="small" effect="plain">{{
                  riskLevelLabel(row.level)
                }}</el-tag></template
              ></el-table-column
            >
            <el-table-column prop="title" label="风险" min-width="150" />
            <el-table-column prop="detail" label="事实依据" min-width="300" show-overflow-tooltip />
            <el-table-column prop="evidenceId" label="证据" width="160" show-overflow-tooltip />
          </el-table>
        </div>
        <div>
          <div class="section-heading section-heading--compact"
            ><div><h3>数据完整度</h3><span>不可用事实不会补零</span></div></div
          >
          <div class="coverage-list">
            <div
              ><span>持有期行情</span
              ><el-progress :percentage="percentage(decisionCoverage.stockHoldingCoverageRate)"
            /></div>
            <div
              ><span>成交后节点</span
              ><el-progress :percentage="percentage(decisionCoverage.stockNodeCoverageRate)"
            /></div>
            <div
              ><span>基准节点</span
              ><el-progress :percentage="percentage(decisionCoverage.benchmarkNodeCoverageRate)"
            /></div>
            <div
              ><span>行情股票</span
              ><el-progress :percentage="percentage(dashboard.dataQuality.marketCoverageRate)"
            /></div>
          </div>
          <div class="issue-list issue-list--embedded">
            <el-alert
              v-for="issue in combinedIssues"
              :key="issue"
              :title="issue"
              type="warning"
              :closable="false"
              show-icon
            />
            <el-empty
              v-if="combinedIssues.length === 0"
              description="暂无数据缺口"
              :image-size="72"
            />
          </div>
        </div>
      </section>
    </template>

    <el-drawer v-model="evidenceVisible" :size="evidenceDrawerSize" title="证据详情" append-to-body>
      <div v-if="evidenceDetail" class="evidence-panel">
        <div class="evidence-header"
          ><strong>{{ evidenceDetail.title }}</strong
          ><el-tag effect="plain">{{ evidenceDetail.kind }}</el-tag></div
        >
        <dl>
          <template v-for="item in evidenceDetail.facts" :key="item.label"
            ><dt>{{ item.label }}</dt
            ><dd>{{ item.value }}</dd></template
          >
        </dl>
        <h4>证据编号</h4>
        <div class="evidence-tags"
          ><el-tag v-for="id in evidenceDetail.evidenceIds" :key="id" size="small" effect="plain">{{
            id
          }}</el-tag></div
        >
        <template v-if="evidenceDetail.issues.length"
          ><h4>数据说明</h4
          ><el-alert
            v-for="issue in evidenceDetail.issues"
            :key="issue"
            :title="issue"
            type="warning"
            :closable="false"
            show-icon
        /></template>
      </div>
    </el-drawer>
  </div>
  <el-empty v-else description="点击“计算系统分析”后显示确定性指标" />
</template>

<script setup lang="ts">
import { Search } from '@element-plus/icons-vue'
import { useWindowSize } from '@vueuse/core'
import type { EChartsOption } from 'echarts'
import type {
  StockAiAnalysisDashboardVO,
  StockAttributionCategory,
  StockAttributionStatus,
  StockDecisionDimension,
  StockDecisionScoreStatus,
  StockDecisionType,
  StockKeyDecisionVO,
  StockTradePlanAuditVO,
  StockTradePlanCheckStatus,
  StockTradeEpisodeStatus
} from '@/api/finance/stock/ai-analysis'
import { Echart } from '@/components/Echart'

defineOptions({ name: 'FinanceStockAiDashboardPanel' })

const props = defineProps<{
  dashboard?: StockAiAnalysisDashboardVO
  mode: 'overview' | 'episodes' | 'stocks' | 'attribution' | 'discipline'
}>()

const dashboard = computed(() => props.dashboard!)
const episodeKeyword = ref('')
const episodeStatusFilter = ref<StockTradeEpisodeStatus | ''>('')
const episodeDecisionFilter = ref<StockDecisionType | ''>('')
const evidenceVisible = ref(false)
const evidenceDetail = ref<EvidenceDetail>()
const { width } = useWindowSize()
const evidenceDrawerSize = computed(() => (width.value < 680 ? '92%' : '560px'))

interface EvidenceDetail {
  title: string
  kind: string
  facts: Array<{ label: string; value: string }>
  evidenceIds: string[]
  issues: string[]
}

const episodeStatusOptions: Array<{ label: string; value: StockTradeEpisodeStatus }> = [
  { label: '持有中', value: 'OPEN' },
  { label: '已闭合', value: 'CLOSED' },
  { label: '不完整', value: 'INCOMPLETE' },
  { label: '异常', value: 'INVALID' }
]

const stockById = computed(
  () => new Map((dashboard.value.stocks || []).map((item) => [item.stockId, item]))
)
const metricByEpisode = computed(
  () => new Map((dashboard.value.decisionMetrics || []).map((item) => [item.episodeId, item]))
)
const decisionByEpisode = computed(
  () => new Map((dashboard.value.keyDecisions || []).map((item) => [item.episodeId, item]))
)
const decisionDimensions = computed(() => dashboard.value.decisionQuality || [])
const planAuditRows = computed(() =>
  (dashboard.value.planAudits || []).map((audit) => {
    const stock = audit.stockId == null ? undefined : stockById.value.get(audit.stockId)
    return {
      ...audit,
      stockName: stock?.name || `股票 #${audit.stockId ?? '--'}`,
      stockCode: stock ? `${stock.market}:${stock.code}` : '--'
    }
  })
)
const attribution = computed(() => dashboard.value.attribution || null)
const attributionItems = computed(() => attribution.value?.items || [])
const decisionCoverage = computed(
  () =>
    dashboard.value.dataCoverage || {
      episodeCount: dashboard.value.episodes?.length || 0,
      metricCount: dashboard.value.decisionMetrics?.length || 0,
      scoreableEpisodeCount: 0,
      averageCoverageRate: null,
      stockHoldingCoverageRate: null,
      stockNodeCoverageRate: null,
      benchmarkNodeCoverageRate: null,
      issues: []
    }
)

const episodeRows = computed(() =>
  (dashboard.value.episodes || []).map((episode) => {
    const stock = episode.stockId == null ? undefined : stockById.value.get(episode.stockId)
    const metric = metricByEpisode.value.get(episode.episodeId)
    const decision = decisionByEpisode.value.get(episode.episodeId)
    return {
      ...episode,
      stockName: stock?.name || `股票 #${episode.stockId ?? '--'}`,
      stockCode: stock ? `${stock.market}:${stock.code}` : '--',
      decisionType: decision?.type || 'NEUTRAL',
      netProfitLoss: metric?.netProfitLoss ?? null,
      episodeReturnRate: metric?.episodeReturnRate ?? null,
      excessReturnRate: metric?.excessReturnRate ?? null,
      mfeRate: metric?.mfeRate ?? null,
      maeRate: metric?.maeRate ?? null,
      maxProfitGivebackAmount: metric?.maxProfitGivebackAmount ?? null,
      coverageRate: metric?.coverageRate ?? null,
      metric,
      decision
    }
  })
)

const filteredEpisodeRows = computed(() => {
  const keyword = episodeKeyword.value.trim().toLowerCase()
  return episodeRows.value.filter((row) => {
    if (episodeStatusFilter.value && row.status !== episodeStatusFilter.value) return false
    if (episodeDecisionFilter.value && row.decisionType !== episodeDecisionFilter.value)
      return false
    return (
      !keyword ||
      row.stockName.toLowerCase().includes(keyword) ||
      row.stockCode.toLowerCase().includes(keyword)
    )
  })
})

const scoreableDimensions = computed(() =>
  decisionDimensions.value.filter((item) => item.status !== 'NOT_SCORABLE' && item.score != null)
)
const scoreableDimensionCount = computed(() => scoreableDimensions.value.length)
const decisionScoreAverage = computed(() =>
  scoreableDimensions.value.length
    ? scoreableDimensions.value.reduce((sum, item) => sum + Number(item.score || 0), 0) /
      scoreableDimensions.value.length
    : null
)
const largestPositiveDecision = computed(
  () =>
    [...(dashboard.value.keyDecisions || [])]
      .filter((item) => item.type === 'POSITIVE')
      .sort((a, b) => Number(b.impactAmount || 0) - Number(a.impactAmount || 0))[0]
)
const largestNegativeDecision = computed(
  () =>
    [...(dashboard.value.keyDecisions || [])]
      .filter((item) => item.type === 'NEGATIVE')
      .sort((a, b) => Number(a.impactAmount || 0) - Number(b.impactAmount || 0))[0]
)
const maxProfitGiveback = computed(() =>
  Math.max(
    0,
    ...(dashboard.value.decisionMetrics || []).map((item) =>
      Number(item.maxProfitGivebackAmount || 0)
    )
  )
)
const combinedIssues = computed(() => [
  ...new Set([
    ...(decisionCoverage.value.issues || []),
    ...(dashboard.value.dataQuality.messages || []),
    ...(attribution.value?.issues || [])
  ])
])

const formatPercent = (value: number | null | undefined) =>
  value == null || !Number.isFinite(Number(value)) ? '--' : `${Number(value).toFixed(2)}%`
const formatNumber = (value: number | null | undefined) =>
  value == null || !Number.isFinite(Number(value)) ? '--' : Number(value).toFixed(2)
const formatAmount = (value: number | null | undefined) =>
  value == null || !Number.isFinite(Number(value))
    ? '--'
    : Number(value).toLocaleString('zh-CN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })
const formatPrice = (value: number | null | undefined) =>
  value == null ? '--' : Number(value).toFixed(3)
const formatQuantity = (value: number | null | undefined) =>
  value == null ? '--' : Number(value).toLocaleString('zh-CN', { maximumFractionDigits: 3 })
const formatDateTime = (value: string | null | undefined) =>
  value ? String(value).replace('T', ' ').slice(0, 19) : '--'
const changeClass = (value: number | null | undefined) =>
  value == null ? '' : Number(value) >= 0 ? 'positive-number' : 'negative-number'
const percentage = (value: number | null | undefined) =>
  value == null ? 0 : Math.max(0, Math.min(100, Number(value)))
const stockLabel = (stockId: number | null | undefined) =>
  stockId == null ? '--' : stockById.value.get(stockId)?.name || `股票 #${stockId}`
const decisionStockLabel = (decision?: StockKeyDecisionVO) =>
  decision ? stockLabel(decision.stockId) : '--'

const dimensionLabels: Record<StockDecisionDimension, string> = {
  STOCK_SELECTION: '选股',
  ENTRY: '买入',
  EXIT: '卖出',
  POSITION: '仓位',
  DISCIPLINE: '纪律'
}
const dimensionLabel = (value: StockDecisionDimension) => dimensionLabels[value] || value
const dimensionStatusLabel = (value: StockDecisionScoreStatus) =>
  ({ SCOREABLE: '可评分', LOW_SAMPLE: '少样本', NOT_SCORABLE: '不可评分' })[value] || value
const dimensionStatusTag = (value: StockDecisionScoreStatus) =>
  value === 'SCOREABLE' ? 'success' : value === 'LOW_SAMPLE' ? 'warning' : 'info'
const decisionTypeLabel = (value: StockDecisionType) =>
  ({ POSITIVE: '正贡献', NEGATIVE: '负贡献', NEUTRAL: '中性' })[value] || value
const decisionTagType = (value: StockDecisionType) =>
  value === 'POSITIVE' ? 'success' : value === 'NEGATIVE' ? 'danger' : 'info'
const episodeStatusLabel = (value: StockTradeEpisodeStatus) =>
  ({ OPEN: '持有中', CLOSED: '已闭合', INCOMPLETE: '不完整', INVALID: '异常' })[value] || value
const episodeStatusTag = (value: StockTradeEpisodeStatus) =>
  value === 'CLOSED'
    ? 'success'
    : value === 'OPEN'
      ? 'primary'
      : value === 'INCOMPLETE'
        ? 'warning'
        : 'danger'
const attributionCategoryLabel = (value: StockAttributionCategory) =>
  ({
    MARKET: '市场',
    INDUSTRY_STYLE: '行业/风格',
    STOCK_EXCESS: '个股超额',
    TIMING: '择时',
    POSITION: '仓位',
    FEES: '费用',
    CASH_FLOW: '现金流',
    UNATTRIBUTED: '未归因'
  })[value] || value
const attributionStatusLabel = (value: StockAttributionStatus) =>
  ({ EXACT: '精确', DERIVED: '推导', FALLBACK: '退化', UNAVAILABLE: '不可用' })[value] || value
const attributionStatusTag = (value: StockAttributionStatus) =>
  value === 'EXACT'
    ? 'success'
    : value === 'DERIVED'
      ? 'primary'
      : value === 'FALLBACK'
        ? 'warning'
        : 'info'
const riskLevelLabel = (value: string) =>
  ({ HIGH: '高', MEDIUM: '中', INFO: '提示' })[value] || value
const riskTagType = (value: string) =>
  value === 'HIGH' ? 'danger' : value === 'MEDIUM' ? 'warning' : 'info'
const planCheckLabels: Record<string, string> = {
  ENTRY_PRICE_RANGE: '买入价格区间',
  STOP_LOSS: '止损参考',
  TARGET_PRICE: '目标参考',
  MAX_POSITION_RATE: '计划仓位上限',
  MAX_LOSS_AMOUNT: '最大可承受亏损',
  HOLDING_PERIOD: '计划持有周期',
  INVALIDATION_CONDITION: '逻辑失效条件',
  TRADE_STYLE: '交易风格',
  STRATEGY_TYPE: '策略类型',
  ENTRY_LOGIC: '买入逻辑',
  TRIGGER_CONDITION: '触发条件',
  EXIT_REASON: '实际退出原因',
  CHANGE_REASON: '计划变更原因',
  EMOTION_TAG: '情绪标签',
  REVIEW_REMARK: '复盘备注'
}
const planCheckLabel = (value: string) => planCheckLabels[value] || value
const planCheckStatusLabel = (value: StockTradePlanCheckStatus) =>
  ({ ADHERED: '遵守', VIOLATED: '违反', NOT_JUDGABLE: '不可判断' })[value] || value
const planCheckTag = (value: StockTradePlanCheckStatus) =>
  value === 'ADHERED' ? 'success' : value === 'VIOLATED' ? 'danger' : 'info'
const planTrustLabel = (audit: StockTradePlanAuditVO) =>
  !audit.preTradePlan ? '非事前计划' : audit.structuredPlanTrusted ? '事前可信' : '事后已改写'
const planTrustTag = (audit: StockTradePlanAuditVO) =>
  !audit.preTradePlan ? 'info' : audit.structuredPlanTrusted ? 'success' : 'warning'
const qualityTagType = computed(() =>
  dashboard.value.dataQuality.score >= 80
    ? 'success'
    : dashboard.value.dataQuality.score >= 55
      ? 'warning'
      : 'danger'
)
const reconciliationTagType = computed(() =>
  Math.abs(Number(attribution.value?.reconciliationDifference || 0)) < 0.000001
    ? 'success'
    : 'danger'
)

const decisionQualityOptions = computed<EChartsOption>(() => ({
  animation: false,
  color: ['#2563eb'],
  grid: { left: 18, right: 20, top: 16, bottom: 30, containLabel: true },
  tooltip: { trigger: 'axis' },
  xAxis: {
    type: 'category',
    data: decisionDimensions.value.map((item) => dimensionLabel(item.dimension))
  },
  yAxis: { type: 'value', min: 0, max: 100 },
  series: [
    { type: 'bar', barMaxWidth: 34, data: decisionDimensions.value.map((item) => item.score) }
  ]
}))

const attributionOptions = computed<EChartsOption>(() => ({
  animation: false,
  grid: { left: 18, right: 24, top: 12, bottom: 24, containLabel: true },
  tooltip: { trigger: 'axis', valueFormatter: (value: unknown) => formatAmount(Number(value)) },
  xAxis: { type: 'value' },
  yAxis: {
    type: 'category',
    data: attributionItems.value.map((item) => attributionCategoryLabel(item.category))
  },
  series: [
    {
      type: 'bar',
      barMaxWidth: 24,
      data: attributionItems.value.map((item) => ({
        value: item.amount,
        itemStyle: { color: Number(item.amount || 0) >= 0 ? '#cf2e2e' : '#16845b' }
      }))
    }
  ]
}))

const episodeFillRows = (row: (typeof episodeRows.value)[number]) =>
  row.fills.map((fill) => {
    const performance = row.metric?.fillPerformances?.find(
      (item) => item.tradeEvidenceId === fill.evidenceId
    )
    const horizon = (day: number) =>
      performance?.horizons?.find((item) => item.tradingDay === day)?.stockReturnRate ?? null
    return {
      ...fill,
      horizon1: horizon(1),
      horizon3: horizon(3),
      horizon5: horizon(5),
      horizon10: horizon(10)
    }
  })

const openDecisionEvidence = (decision: StockKeyDecisionVO) => {
  const metric = metricByEpisode.value.get(decision.episodeId)
  evidenceDetail.value = {
    title: `${stockLabel(decision.stockId)} · ${decision.summary}`,
    kind: '关键决策',
    facts: [
      { label: '实际影响', value: formatAmount(decision.impactAmount) },
      { label: '回合收益', value: formatPercent(decision.impactRate) },
      { label: '基准超额', value: formatPercent(decision.excessReturnRate) },
      {
        label: 'MFE / MAE',
        value: `${formatPercent(metric?.mfeRate)} / ${formatPercent(metric?.maeRate)}`
      }
    ],
    evidenceIds: decision.evidenceIds || [],
    issues: metric?.issues || []
  }
  evidenceVisible.value = true
}

const openEpisodeEvidence = (row: (typeof episodeRows.value)[number]) => {
  evidenceDetail.value = {
    title: `${row.stockName} · ${episodeStatusLabel(row.status)}`,
    kind: '交易回合',
    facts: [
      { label: '回合编号', value: row.episodeId },
      { label: '分析区间成交', value: String(row.analysisTradeCount) },
      { label: '区间前建仓', value: row.startedBeforeAnalysisRange ? '是' : '否' },
      { label: '净盈亏', value: formatAmount(row.netProfitLoss) },
      {
        label: '回合收益 / 超额',
        value: `${formatPercent(row.episodeReturnRate)} / ${formatPercent(row.excessReturnRate)}`
      },
      { label: '覆盖率', value: formatPercent(row.coverageRate) }
    ],
    evidenceIds: [
      ...new Set([...(row.metric?.evidenceIds || []), ...row.fills.map((fill) => fill.evidenceId)])
    ],
    issues: [...new Set([...(row.issues || []), ...(row.metric?.issues || [])])]
  }
  evidenceVisible.value = true
}

const openPlanAuditEvidence = (row: (typeof planAuditRows.value)[number]) => {
  evidenceDetail.value = {
    title: `${row.stockName} · 交易计划纪律审计`,
    kind: '系统确定性',
    facts: [
      { label: '回合编号', value: row.episodeId },
      { label: '计划编号', value: row.planId == null ? '--' : `PLAN-${row.planId}` },
      { label: '计划建立', value: formatDateTime(row.establishedTime) },
      { label: '首次成交', value: formatDateTime(row.firstTradeTime) },
      { label: '结构化字段', value: planTrustLabel(row) },
      {
        label: '遵守 / 违反 / 未判断',
        value: `${row.adheredCount} / ${row.violatedCount} / ${row.notJudgableCount}`
      },
      {
        label: '遵守率 / 覆盖率',
        value: `${formatPercent(row.adherenceRate)} / ${formatPercent(row.coverageRate)}`
      }
    ],
    evidenceIds: row.evidenceIds || [],
    issues: row.issues || []
  }
  evidenceVisible.value = true
}
</script>

<style scoped lang="scss">
.decision-workbench {
  min-width: 0;
  background: var(--el-bg-color);
  border-right: 1px solid var(--el-border-color-light);
  border-bottom: 1px solid var(--el-border-color-light);
  border-left: 1px solid var(--el-border-color-light);
}

.workbench-section {
  padding: 18px 20px;
  border-bottom: 1px solid var(--el-border-color-lighter);
}

.workbench-section:last-child {
  border-bottom: 0;
}

.workbench-section--lead {
  background: linear-gradient(90deg, var(--el-bg-color) 0%, var(--el-fill-color-extra-light) 100%);
}

.section-heading {
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  gap: 16px;
  margin-bottom: 14px;
}

.section-heading--compact {
  margin-bottom: 8px;
}

.section-heading h2,
.section-heading h3 {
  padding: 0;
  margin: 0;
  letter-spacing: 0;
  color: var(--el-text-color-primary);
}

.section-heading h2 {
  font-size: 16px;
}

.section-heading h3 {
  font-size: 14px;
}

.section-heading span,
.cell-subtitle {
  display: block;
  margin-top: 3px;
  font-size: 11px;
  color: var(--el-text-color-placeholder);
}

.version-tags,
.table-tools,
.dimension-title,
.evidence-header,
.evidence-tags,
.audit-legend,
.audit-source-heading {
  display: flex;
  align-items: center;
  gap: 8px;
}

.version-tags {
  flex-wrap: wrap;
  justify-content: flex-end;
}

.summary-grid {
  display: grid;
  grid-template-columns: repeat(4, minmax(0, 1fr));
  border: 1px solid var(--el-border-color-lighter);
}

.summary-cell {
  display: flex;
  min-height: 96px;
  flex-direction: column;
  justify-content: center;
  gap: 5px;
  padding: 12px 14px;
  background: var(--el-bg-color);
  border-right: 1px solid var(--el-border-color-lighter);
  border-bottom: 1px solid var(--el-border-color-lighter);
}

.summary-cell:nth-child(4n) {
  border-right: 0;
}

.summary-cell:nth-last-child(-n + 4) {
  border-bottom: 0;
}

.summary-cell--primary {
  box-shadow: inset 3px 0 0 var(--el-color-primary);
}

.summary-cell > span,
.attribution-summary span,
.behavior-grid span,
.coverage-list span {
  font-size: 12px;
  color: var(--el-text-color-secondary);
}

.summary-cell strong {
  font-size: 20px;
  line-height: 26px;
}

.summary-cell small {
  min-height: 16px;
  font-size: 11px;
  color: var(--el-text-color-placeholder);
}

.positive-number {
  color: var(--el-color-danger);
}

.negative-number {
  color: var(--el-color-success);
}

.chart-grid {
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: 24px;
}

.chart-block {
  min-width: 0;
}

.table-tools {
  flex-wrap: wrap;
  justify-content: flex-end;
}

.table-tools :deep(.el-input) {
  width: 190px;
}

.table-tools :deep(.el-select) {
  width: 128px;
}

.episode-expand {
  padding: 8px 16px 14px 48px;
  background: var(--el-fill-color-extra-light);
}

.attribution-summary,
.behavior-grid {
  display: grid;
  grid-template-columns: repeat(4, minmax(0, 1fr));
  border: 1px solid var(--el-border-color-lighter);
}

.attribution-summary > div,
.behavior-grid > div {
  display: flex;
  min-height: 76px;
  flex-direction: column;
  justify-content: center;
  gap: 5px;
  padding: 10px 12px;
  border-right: 1px solid var(--el-border-color-lighter);
}

.attribution-summary > div:last-child,
.behavior-grid > div:nth-child(4n) {
  border-right: 0;
}

.attribution-summary strong,
.behavior-grid strong {
  font-size: 17px;
}

.dimension-grid {
  display: grid;
  grid-template-columns: repeat(5, minmax(0, 1fr));
  border: 1px solid var(--el-border-color-lighter);
}

.dimension-cell {
  min-height: 150px;
  padding: 12px;
  border-right: 1px solid var(--el-border-color-lighter);
}

.dimension-cell:last-child {
  border-right: 0;
}

.dimension-title {
  justify-content: space-between;
}

.dimension-cell > strong {
  display: block;
  margin-top: 12px;
  font-size: 28px;
}

.dimension-cell > small {
  font-size: 11px;
  color: var(--el-text-color-placeholder);
}

.dimension-cell p {
  display: -webkit-box;
  margin: 10px 0 0;
  overflow: hidden;
  font-size: 12px;
  line-height: 19px;
  color: var(--el-text-color-secondary);
  -webkit-box-orient: vertical;
  -webkit-line-clamp: 2;
}

.behavior-grid {
  grid-template-columns: repeat(3, minmax(0, 1fr));
  margin-bottom: 14px;
}

.behavior-grid > div:nth-child(3n) {
  border-right: 0;
}

.risk-table {
  margin-top: 12px;
}

.plan-audit-expand {
  padding: 12px 16px 16px 48px;
  background: var(--el-fill-color-extra-light);
}

.audit-source-heading {
  justify-content: space-between;
  margin-bottom: 8px;
}

.audit-source-heading--ai {
  padding-top: 16px;
  margin-top: 16px;
  border-top: 1px solid var(--el-border-color-lighter);
}

.audit-source-heading strong,
.audit-source-heading span {
  display: block;
}

.audit-source-heading strong {
  font-size: 13px;
}

.audit-source-heading span {
  margin-top: 3px;
  font-size: 11px;
  color: var(--el-text-color-placeholder);
}

.audit-count {
  display: inline-flex;
  min-width: 30px;
  justify-content: center;
  font-variant-numeric: tabular-nums;
  color: var(--el-text-color-secondary);
}

.audit-count--adhered {
  color: var(--el-color-success);
}

.audit-count--violated {
  color: var(--el-color-danger);
}

.coverage-list {
  display: grid;
  gap: 14px;
  padding: 6px 0 16px;
}

.coverage-list > div {
  display: grid;
  grid-template-columns: 96px minmax(0, 1fr);
  align-items: center;
  gap: 12px;
}

.issue-list {
  display: grid;
  gap: 8px;
}

.issue-list--embedded {
  max-height: 320px;
  overflow-y: auto;
}

.evidence-panel {
  min-width: 0;
}

.evidence-header {
  justify-content: space-between;
  padding-bottom: 14px;
  border-bottom: 1px solid var(--el-border-color-lighter);
}

.evidence-panel dl {
  display: grid;
  grid-template-columns: 120px minmax(0, 1fr);
  margin: 16px 0;
}

.evidence-panel dt,
.evidence-panel dd {
  padding: 8px 0;
  border-bottom: 1px solid var(--el-border-color-extra-light);
}

.evidence-panel dt {
  font-size: 12px;
  color: var(--el-text-color-secondary);
}

.evidence-panel dd {
  min-width: 0;
  margin: 0;
  overflow-wrap: anywhere;
}

.evidence-panel h4 {
  margin: 18px 0 10px;
  font-size: 13px;
}

.evidence-tags {
  flex-wrap: wrap;
}

.evidence-panel :deep(.el-alert + .el-alert) {
  margin-top: 8px;
}

@media (width <= 1100px) {
  .summary-grid {
    grid-template-columns: repeat(2, minmax(0, 1fr));
  }

  .summary-cell:nth-child(2n) {
    border-right: 0;
  }

  .summary-cell:nth-last-child(-n + 4) {
    border-bottom: 1px solid var(--el-border-color-lighter);
  }

  .summary-cell:nth-last-child(-n + 2) {
    border-bottom: 0;
  }

  .dimension-grid {
    grid-template-columns: repeat(2, minmax(0, 1fr));
  }

  .dimension-cell {
    border-bottom: 1px solid var(--el-border-color-lighter);
  }

  .dimension-cell:nth-child(2n) {
    border-right: 0;
  }

  .dimension-cell:last-child {
    border-bottom: 0;
  }
}

@media (width <= 760px) {
  .workbench-section {
    padding: 14px 12px;
  }

  .chart-grid {
    grid-template-columns: minmax(0, 1fr);
  }

  .section-heading {
    flex-direction: column;
  }

  .table-tools {
    width: 100%;
    justify-content: flex-start;
  }

  .table-tools :deep(.el-input),
  .table-tools :deep(.el-select) {
    width: 100%;
  }

  .attribution-summary,
  .behavior-grid {
    grid-template-columns: repeat(2, minmax(0, 1fr));
  }

  .attribution-summary > div:nth-child(2n),
  .behavior-grid > div:nth-child(2n) {
    border-right: 0;
  }

  .episode-expand {
    padding-left: 8px;
  }

  .plan-audit-expand {
    padding-right: 8px;
    padding-left: 8px;
  }
}

@media (width <= 520px) {
  .summary-grid,
  .dimension-grid {
    grid-template-columns: minmax(0, 1fr);
  }

  .summary-cell,
  .summary-cell:nth-child(2n),
  .dimension-cell {
    border-right: 0;
    border-bottom: 1px solid var(--el-border-color-lighter);
  }

  .summary-cell:last-child,
  .dimension-cell:last-child {
    border-bottom: 0;
  }
}
</style>
