<template>
  <ContentWrap>
    <div class="portfolio-header">
      <div class="portfolio-title">
        <div>
          <h1>我的持仓</h1>
          <p>
            {{ summary.positionCount }} 只持仓
            <span v-if="summary.latestImportTime"
              >· 快照 {{ formatDateTime(summary.latestImportTime) }}</span
            >
          </p>
        </div>
        <el-tag v-if="summary.missingValuationCount" type="warning" effect="plain">
          {{ summary.missingValuationCount }} 只缺少估值
        </el-tag>
      </div>

      <div class="portfolio-actions">
        <el-button
          type="primary"
          v-hasPermi="['finance:stock-position:create']"
          @click="openCreate"
        >
          <Icon icon="ep:plus" class="mr-5px" />
          录入持仓
        </el-button>
        <el-button v-hasPermi="['finance:stock-position:create']" @click="importDialogRef?.open()">
          <Icon icon="ep:upload" class="mr-5px" />
          导入 Excel
        </el-button>
        <el-button :loading="quoteLoading" @click="refreshQuotes">
          <Icon icon="ep:trend-charts" class="mr-5px" />
          刷新行情
        </el-button>
        <el-tooltip content="重新加载持仓、清仓和账户数据" placement="top">
          <el-button circle :loading="loading" aria-label="重新加载数据" @click="refreshAll">
            <Icon icon="ep:refresh" />
          </el-button>
        </el-tooltip>
      </div>
    </div>

    <div class="portfolio-summary">
      <section class="summary-metric summary-metric--asset">
        <div class="summary-metric__label">
          <span>总资产</span>
          <el-tooltip content="设置总资产" placement="top">
            <el-button
              link
              type="primary"
              aria-label="设置总资产"
              v-hasPermi="['finance:stock-position:update']"
              @click="openAssetForm"
            >
              <Icon icon="ep:edit" />
            </el-button>
          </el-tooltip>
        </div>
        <strong>{{ formatAmount(summary.totalAsset) }}</strong>
      </section>
      <section class="summary-metric summary-metric--cash">
        <span>可用资产</span>
        <strong>{{ formatAmount(summary.availableAsset) }}</strong>
      </section>
      <section class="summary-metric">
        <span>持有金额</span>
        <strong>{{ formatAmount(summary.holdingAmount) }}</strong>
      </section>
      <section class="summary-metric" :class="changeClass(summary.holdingProfitLoss)">
        <span>持有盈亏</span>
        <strong>{{ formatSignedAmount(summary.holdingProfitLoss) }}</strong>
      </section>
      <section class="summary-metric" :class="changeClass(summary.dailyProfitLoss)">
        <span>当日盈亏</span>
        <strong>{{ formatSignedAmount(summary.dailyProfitLoss) }}</strong>
      </section>
      <section class="summary-metric">
        <span>仓位占比</span>
        <strong>{{ formatPercent(summary.positionRatio) }}</strong>
      </section>
      <section class="summary-metric">
        <span>上涨 / 下跌</span>
        <strong>{{ summary.risingCount }} / {{ summary.fallingCount }}</strong>
      </section>
      <section class="summary-metric">
        <span>持仓股票</span>
        <strong>{{ summary.positionCount }}</strong>
      </section>
    </div>
  </ContentWrap>

  <ContentWrap>
    <el-tabs v-model="activeTab" class="portfolio-tabs">
      <el-tab-pane label="当前持仓" name="positions">
        <div class="view-toolbar">
          <el-input
            v-model="positionKeyword"
            class="keyword-input"
            clearable
            placeholder="股票代码、名称或板块"
            :prefix-icon="Search"
          />
          <el-segmented v-model="positionView" :options="positionViewOptions" />
          <div class="toolbar-spacer"></div>
          <span class="result-context"
            >显示 {{ displayPositionRows.length }} / {{ rows.length }} 只</span
          >
        </div>

        <el-table
          v-loading="loading"
          :data="displayPositionRows"
          row-key="id"
          stripe
          show-summary
          :summary-method="getPositionSummaries"
          table-layout="fixed"
          empty-text="暂无持仓，可手工录入或导入 Excel"
          @sort-change="handlePositionSort"
        >
          <el-table-column prop="name" label="股票" min-width="150" fixed="left" sortable="custom">
            <template #default="{ row }">
              <button class="stock-link" :disabled="!row.track" @click="openDetail(row)">
                <span>{{ row.name }}</span>
                <small>{{ row.symbol }}</small>
              </button>
            </template>
          </el-table-column>
          <el-table-column
            v-if="showPositionColumn('holdingAmount')"
            prop="holdingAmount"
            label="持有金额"
            width="132"
            align="right"
            sortable="custom"
          >
            <template #default="{ row }">{{ formatAmount(row.valuationAmount) }}</template>
          </el-table-column>
          <el-table-column
            v-if="showPositionColumn('dailyProfitLoss')"
            prop="dailyProfitLoss"
            label="当日盈亏"
            width="126"
            align="right"
            sortable="custom"
          >
            <template #default="{ row }">
              <span :class="changeClass(row.dailyProfitLoss)">
                {{ formatSignedAmount(row.dailyProfitLoss) }}
              </span>
            </template>
          </el-table-column>
          <el-table-column
            v-if="showPositionColumn('dailyProfitRate')"
            prop="dailyProfitRate"
            label="当日盈亏率"
            width="120"
            align="right"
            sortable="custom"
          >
            <template #default="{ row }">
              <span :class="changeClass(row.dailyProfitRate)">{{
                formatPercent(row.dailyProfitRate)
              }}</span>
            </template>
          </el-table-column>
          <el-table-column
            v-if="showPositionColumn('portfolioProfitLoss')"
            prop="portfolioProfitLoss"
            label="组合盈亏"
            width="126"
            align="right"
            sortable="custom"
          >
            <template #default="{ row }">
              <span :class="changeClass(row.portfolioProfitLoss)">
                {{ formatSignedAmount(row.portfolioProfitLoss) }}
              </span>
            </template>
          </el-table-column>
          <el-table-column
            v-if="showPositionColumn('portfolioChangeRate')"
            prop="portfolioChangeRate"
            label="组合涨幅"
            width="112"
            align="right"
            sortable="custom"
          >
            <template #default="{ row }">
              <span :class="changeClass(row.portfolioChangeRate)">
                {{ formatPercent(row.portfolioChangeRate) }}
              </span>
            </template>
          </el-table-column>
          <el-table-column
            v-if="showPositionColumn('holdingProfitLoss')"
            prop="holdingProfitLoss"
            label="持有盈亏"
            width="126"
            align="right"
            sortable="custom"
          >
            <template #default="{ row }">
              <span :class="changeClass(row.effectiveHoldingProfitLoss)">
                {{ formatSignedAmount(row.effectiveHoldingProfitLoss) }}
              </span>
            </template>
          </el-table-column>
          <el-table-column
            v-if="showPositionColumn('holdingProfitRate')"
            prop="holdingProfitRate"
            label="持有盈亏率"
            width="120"
            align="right"
            sortable="custom"
          >
            <template #default="{ row }">
              <span :class="changeClass(row.effectiveHoldingProfitRate)">
                {{ formatPercent(row.effectiveHoldingProfitRate) }}
              </span>
            </template>
          </el-table-column>
          <el-table-column
            v-if="showPositionColumn('cumulativeProfitLoss')"
            prop="cumulativeProfitLoss"
            label="累计盈亏"
            width="126"
            align="right"
            sortable="custom"
          >
            <template #default="{ row }">
              <span :class="changeClass(row.cumulativeProfitLoss)">
                {{ formatSignedAmount(row.cumulativeProfitLoss) }}
              </span>
            </template>
          </el-table-column>
          <el-table-column
            v-if="showPositionColumn('cumulativeProfitRate')"
            prop="cumulativeProfitRate"
            label="累计盈亏率"
            width="120"
            align="right"
            sortable="custom"
          >
            <template #default="{ row }">
              <span :class="changeClass(row.cumulativeProfitRate)">
                {{ formatPercent(row.cumulativeProfitRate) }}
              </span>
            </template>
          </el-table-column>
          <el-table-column
            v-if="showPositionColumn('weeklyProfitLoss')"
            prop="weeklyProfitLoss"
            label="本周盈亏"
            width="120"
            align="right"
            sortable="custom"
          >
            <template #default="{ row }">
              <span :class="changeClass(row.weeklyProfitLoss)">{{
                formatSignedAmount(row.weeklyProfitLoss)
              }}</span>
            </template>
          </el-table-column>
          <el-table-column
            v-if="showPositionColumn('monthlyProfitLoss')"
            prop="monthlyProfitLoss"
            label="本月盈亏"
            width="120"
            align="right"
            sortable="custom"
          >
            <template #default="{ row }">
              <span :class="changeClass(row.monthlyProfitLoss)">{{
                formatSignedAmount(row.monthlyProfitLoss)
              }}</span>
            </template>
          </el-table-column>
          <el-table-column
            v-if="showPositionColumn('yearlyProfitLoss')"
            prop="yearlyProfitLoss"
            label="今年盈亏"
            width="120"
            align="right"
            sortable="custom"
          >
            <template #default="{ row }">
              <span :class="changeClass(row.yearlyProfitLoss)">{{
                formatSignedAmount(row.yearlyProfitLoss)
              }}</span>
            </template>
          </el-table-column>
          <el-table-column
            v-if="showPositionColumn('positionRatio')"
            prop="positionRatio"
            label="仓位占比"
            width="112"
            align="right"
            sortable="custom"
          >
            <template #default="{ row }">{{ formatPercent(row.effectivePositionRatio) }}</template>
          </el-table-column>
          <el-table-column
            v-if="showPositionColumn('quantity')"
            prop="quantity"
            label="持有数量"
            width="116"
            align="right"
            sortable="custom"
          >
            <template #default="{ row }">{{ formatQuantity(row.quantity) }}</template>
          </el-table-column>
          <el-table-column
            v-if="showPositionColumn('holdingDays')"
            prop="holdingDays"
            label="持仓天数"
            width="104"
            align="right"
            sortable="custom"
          />
          <el-table-column
            v-if="showPositionColumn('latestChangeRate')"
            prop="latestChangeRate"
            label="最新涨幅"
            width="112"
            align="right"
            sortable="custom"
          >
            <template #default="{ row }">
              <span :class="changeClass(row.latestChangeRate)">{{
                formatPercent(row.latestChangeRate)
              }}</span>
            </template>
          </el-table-column>
          <el-table-column
            v-if="showPositionColumn('latestPrice')"
            prop="latestPrice"
            label="最新价"
            width="104"
            align="right"
            sortable="custom"
          >
            <template #default="{ row }">{{ formatPrice(row.latestPrice) }}</template>
          </el-table-column>
          <el-table-column
            v-if="showPositionColumn('averageCostPrice')"
            prop="averageCostPrice"
            label="单位成本"
            width="108"
            align="right"
            sortable="custom"
          >
            <template #default="{ row }">{{ formatPrice(row.averageCostPrice) }}</template>
          </el-table-column>
          <el-table-column
            v-if="showPositionColumn('breakEvenChangeRate')"
            prop="breakEvenChangeRate"
            label="回本涨幅"
            width="112"
            align="right"
            sortable="custom"
          >
            <template #default="{ row }">
              <span :class="changeClass(row.breakEvenChangeRate)">{{
                formatPercent(row.breakEvenChangeRate)
              }}</span>
            </template>
          </el-table-column>
          <el-table-column
            v-if="showPositionColumn('oneMonthChangeRate')"
            prop="oneMonthChangeRate"
            label="近1月涨幅"
            width="112"
            align="right"
            sortable="custom"
          >
            <template #default="{ row }">
              <span :class="changeClass(row.oneMonthChangeRate)">{{
                formatPercent(row.oneMonthChangeRate)
              }}</span>
            </template>
          </el-table-column>
          <el-table-column
            v-if="showPositionColumn('threeMonthChangeRate')"
            prop="threeMonthChangeRate"
            label="近3月涨幅"
            width="112"
            align="right"
            sortable="custom"
          >
            <template #default="{ row }">
              <span :class="changeClass(row.threeMonthChangeRate)">{{
                formatPercent(row.threeMonthChangeRate)
              }}</span>
            </template>
          </el-table-column>
          <el-table-column
            v-if="showPositionColumn('sixMonthChangeRate')"
            prop="sixMonthChangeRate"
            label="近6月涨幅"
            width="112"
            align="right"
            sortable="custom"
          >
            <template #default="{ row }">
              <span :class="changeClass(row.sixMonthChangeRate)">{{
                formatPercent(row.sixMonthChangeRate)
              }}</span>
            </template>
          </el-table-column>
          <el-table-column
            v-if="showPositionColumn('oneYearChangeRate')"
            prop="oneYearChangeRate"
            label="近1年涨幅"
            width="112"
            align="right"
            sortable="custom"
          >
            <template #default="{ row }">
              <span :class="changeClass(row.oneYearChangeRate)">{{
                formatPercent(row.oneYearChangeRate)
              }}</span>
            </template>
          </el-table-column>
          <el-table-column
            v-if="showPositionColumn('relatedSector')"
            prop="relatedSector"
            label="关联板块"
            min-width="132"
            sortable="custom"
            show-overflow-tooltip
          >
            <template #default="{ row }">{{ row.relatedSector || '--' }}</template>
          </el-table-column>
          <el-table-column
            v-if="showPositionColumn('sectorChangeRate')"
            prop="sectorChangeRate"
            label="板块涨幅"
            width="112"
            align="right"
            sortable="custom"
          >
            <template #default="{ row }">
              <span :class="changeClass(row.sectorChangeRate)">{{
                formatPercent(row.sectorChangeRate)
              }}</span>
            </template>
          </el-table-column>
          <el-table-column
            v-if="showPositionColumn('openedDate')"
            prop="openedDate"
            label="建仓日期"
            width="118"
            sortable="custom"
          />
          <el-table-column
            v-if="showPositionColumn('importTime')"
            prop="importTime"
            label="数据来源"
            width="154"
            sortable="custom"
          >
            <template #default="{ row }">
              <div class="source-state">
                <el-tag :type="quoteStatusTypes[row.quoteStatus]" size="small" effect="plain">
                  {{ quoteStatusLabels[row.quoteStatus] }}
                </el-tag>
                <small>{{
                  row.importTime ? formatShortDateTime(row.importTime) : '手工维护'
                }}</small>
              </div>
            </template>
          </el-table-column>
          <el-table-column label="操作" width="104" fixed="right" align="center">
            <template #default="{ row }">
              <div class="row-actions">
                <el-tooltip content="编辑持仓" placement="top">
                  <el-button
                    link
                    type="primary"
                    aria-label="编辑持仓"
                    v-hasPermi="['finance:stock-position:update']"
                    @click="openEdit(row)"
                  >
                    <Icon icon="ep:edit" />
                  </el-button>
                </el-tooltip>
                <el-tooltip content="删除持仓" placement="top">
                  <el-button
                    link
                    type="danger"
                    aria-label="删除持仓"
                    v-hasPermi="['finance:stock-position:delete']"
                    @click="handleDelete(row)"
                  >
                    <Icon icon="ep:delete" />
                  </el-button>
                </el-tooltip>
              </div>
            </template>
          </el-table-column>
        </el-table>
      </el-tab-pane>

      <el-tab-pane label="已清仓" name="closed">
        <div class="view-toolbar">
          <el-input
            v-model="closedKeyword"
            class="keyword-input"
            clearable
            placeholder="股票代码或名称"
            :prefix-icon="Search"
          />
          <el-date-picker
            v-model="closedDateRange"
            class="filter-date-range"
            type="daterange"
            value-format="YYYY-MM-DD"
            start-placeholder="清仓开始日期"
            end-placeholder="清仓结束日期"
            range-separator="至"
            unlink-panels
          />
          <div class="toolbar-spacer"></div>
          <span class="result-context">共 {{ filteredClosedRows.length }} 条清仓记录</span>
        </div>

        <div class="compact-summary">
          <section
            ><span>清仓记录</span><strong>{{ closedSummary.count }}</strong></section
          >
          <section
            ><span>盈利胜率</span
            ><strong>{{ formatPercent(closedSummary.winRate) }}</strong></section
          >
          <section :class="changeClass(closedSummary.totalProfitLoss)">
            <span>累计已实现盈亏</span
            ><strong>{{ formatSignedAmount(closedSummary.totalProfitLoss) }}</strong>
          </section>
          <section :class="changeClass(closedSummary.averageExcessReturn)">
            <span>平均跑赢大盘</span
            ><strong>{{ formatPercent(closedSummary.averageExcessReturn) }}</strong>
          </section>
          <section
            ><span>平均持仓天数</span
            ><strong>{{ formatDays(closedSummary.averageHoldingDays) }}</strong></section
          >
        </div>

        <el-table
          :data="displayClosedRows"
          row-key="id"
          stripe
          table-layout="fixed"
          empty-text="暂无已清仓数据，可通过 Excel 导入"
          @sort-change="handleClosedSort"
        >
          <el-table-column prop="name" label="股票" min-width="148" fixed="left" sortable="custom">
            <template #default="{ row }">
              <div class="stock-name">{{ row.name || '--' }}</div>
              <div class="stock-code">{{ stockSymbol(row.market, row.code) }}</div>
            </template>
          </el-table-column>
          <el-table-column prop="closedDate" label="清仓日期" width="116" sortable="custom" />
          <el-table-column
            prop="totalProfitLoss"
            label="总盈亏"
            width="126"
            align="right"
            sortable="custom"
          >
            <template #default="{ row }">
              <span :class="changeClass(row.totalProfitLoss)">{{
                formatSignedAmount(row.totalProfitLoss)
              }}</span>
            </template>
          </el-table-column>
          <el-table-column
            prop="profitRate"
            label="盈亏比"
            width="104"
            align="right"
            sortable="custom"
          >
            <template #default="{ row }">
              <span :class="changeClass(row.profitRate)">{{ formatPercent(row.profitRate) }}</span>
            </template>
          </el-table-column>
          <el-table-column
            prop="benchmarkChangeRate"
            label="同期大盘"
            width="112"
            align="right"
            sortable="custom"
          >
            <template #default="{ row }">{{ formatPercent(row.benchmarkChangeRate) }}</template>
          </el-table-column>
          <el-table-column
            prop="excessReturnRate"
            label="跑赢大盘"
            width="112"
            align="right"
            sortable="custom"
          >
            <template #default="{ row }">
              <span :class="changeClass(row.excessReturnRate)">{{
                formatPercent(row.excessReturnRate)
              }}</span>
            </template>
          </el-table-column>
          <el-table-column
            prop="buyAveragePrice"
            label="买入均价"
            width="108"
            align="right"
            sortable="custom"
          >
            <template #default="{ row }">{{ formatPrice(row.buyAveragePrice) }}</template>
          </el-table-column>
          <el-table-column
            prop="sellAveragePrice"
            label="卖出均价"
            width="108"
            align="right"
            sortable="custom"
          >
            <template #default="{ row }">{{ formatPrice(row.sellAveragePrice) }}</template>
          </el-table-column>
          <el-table-column
            prop="holdingDays"
            label="持仓天数"
            width="104"
            align="right"
            sortable="custom"
          />
          <el-table-column
            prop="daysSinceClosed"
            label="清仓距今"
            width="104"
            align="right"
            sortable="custom"
          />
          <el-table-column
            prop="tradingFee"
            label="交易费用"
            width="112"
            align="right"
            sortable="custom"
          >
            <template #default="{ row }">{{ formatAmount(row.tradingFee) }}</template>
          </el-table-column>
          <el-table-column prop="openedDate" label="建仓日期" width="116" sortable="custom" />
          <el-table-column prop="updateTime" label="更新时间" width="164" sortable="custom">
            <template #default="{ row }">{{ formatDateTime(row.updateTime) }}</template>
          </el-table-column>
        </el-table>
      </el-tab-pane>

      <el-tab-pane label="交易流水" name="trades">
        <div class="view-toolbar">
          <el-input
            v-model="tradeQuery.keyword"
            class="keyword-input"
            clearable
            placeholder="股票代码或名称"
            :prefix-icon="Search"
            @keyup.enter="handleTradeQuery"
          />
          <el-select
            v-model="tradeQuery.tradeType"
            class="trade-type"
            clearable
            placeholder="全部方向"
          >
            <el-option label="买入" value="BUY" />
            <el-option label="卖出" value="SELL" />
            <el-option label="银行转存" value="BANK_DEPOSIT" />
            <el-option label="银行转取" value="BANK_WITHDRAWAL" />
            <el-option label="除权除息" value="EX_DIVIDEND" />
            <el-option label="股息个税" value="DIVIDEND_TAX" />
            <el-option label="证券转入" value="SECURITY_TRANSFER_IN" />
            <el-option label="证券转出" value="SECURITY_TRANSFER_OUT" />
            <el-option label="新股到账" value="NEW_SHARE_CREDIT" />
          </el-select>
          <el-date-picker
            v-model="tradeDateRange"
            class="filter-date-range"
            type="daterange"
            value-format="YYYY-MM-DD"
            start-placeholder="成交开始日期"
            end-placeholder="成交结束日期"
            range-separator="至"
            unlink-panels
            @change="handleTradeQuery"
          />
          <el-button type="primary" @click="handleTradeQuery">
            <Icon icon="ep:search" class="mr-5px" />
            查询
          </el-button>
          <div class="toolbar-spacer"></div>
          <span class="result-context">共 {{ tradeTotal }} 条成交</span>
        </div>

        <div class="compact-summary compact-summary--trade">
          <section
            ><span>成交记录</span><strong>{{ tradeSummary.recordCount }}</strong></section
          >
          <section class="profit-down"
            ><span>买入成交额</span
            ><strong>{{ formatMoneyText(tradeSummary.buyTradeAmount) }}</strong></section
          >
          <section class="profit-up"
            ><span>卖出成交额</span
            ><strong>{{ formatMoneyText(tradeSummary.sellTradeAmount) }}</strong></section
          >
          <section
            ><span>总费用</span
            ><strong>{{ formatMoneyText(tradeSummary.totalFee) }}</strong></section
          >
          <section :class="changeClass(toNumber(tradeSummary.netCashFlow))">
            <span>净资金流</span
            ><strong>{{ formatSignedMoneyText(tradeSummary.netCashFlow) }}</strong>
          </section>
        </div>

        <el-table
          v-loading="tradeLoading"
          :data="tradeRecords"
          row-key="id"
          stripe
          table-layout="fixed"
          empty-text="暂无交易记录"
          @sort-change="handleTradeSort"
        >
          <el-table-column
            prop="stockId"
            label="股票"
            min-width="148"
            fixed="left"
            sortable="custom"
          >
            <template #default="{ row }">
              <div class="stock-name">{{ row.stockId ? row.stockName || '--' : '资金流水' }}</div>
              <div class="stock-code">
                {{ row.stockId ? stockSymbol(row.market, row.code) : '银行资金' }}
              </div>
            </template>
          </el-table-column>
          <el-table-column prop="tradeDate" label="成交日期" width="116" sortable="custom" />
          <el-table-column prop="tradeTime" label="时间" width="92" sortable="custom">
            <template #default="{ row }">{{ formatTradeTime(row.tradeTime) }}</template>
          </el-table-column>
          <el-table-column
            prop="tradeType"
            label="类别"
            width="82"
            align="center"
            sortable="custom"
          >
            <template #default="{ row }">
              <el-tag
                :type="tradeTypeTagTypes[row.tradeType]"
                effect="plain"
                size="small"
              >
                {{ tradeTypeLabels[row.tradeType] }}
              </el-tag>
            </template>
          </el-table-column>
          <el-table-column
            prop="quantity"
            label="成交数量"
            width="112"
            align="right"
            sortable="custom"
          >
            <template #default="{ row }">{{ formatQuantity(toNumber(row.quantity)) }}</template>
          </el-table-column>
          <el-table-column
            prop="price"
            label="成交价格"
            width="108"
            align="right"
            sortable="custom"
          >
            <template #default="{ row }">{{ formatMoneyText(row.price) }}</template>
          </el-table-column>
          <el-table-column
            prop="occurredAmount"
            label="发生金额"
            width="126"
            align="right"
            sortable="custom"
          >
            <template #default="{ row }">
              <span :class="changeClass(toNumber(row.occurredAmount ?? row.netCashFlow))">
                {{ formatSignedMoneyText(row.occurredAmount ?? row.netCashFlow) }}
              </span>
            </template>
          </el-table-column>
          <el-table-column
            prop="tradeAmount"
            label="成交金额"
            width="126"
            align="right"
            sortable="custom"
          >
            <template #default="{ row }">{{ formatMoneyText(row.tradeAmount) }}</template>
          </el-table-column>
          <el-table-column prop="totalFee" label="费用" width="104" align="right" sortable="custom">
            <template #default="{ row }">{{ formatMoneyText(row.totalFee) }}</template>
          </el-table-column>
          <el-table-column
            prop="remark"
            label="备注"
            min-width="180"
            sortable="custom"
            show-overflow-tooltip
          >
            <template #default="{ row }">{{ row.remark || '--' }}</template>
          </el-table-column>
          <el-table-column prop="updateTime" label="更新时间" width="164" sortable="custom">
            <template #default="{ row }">{{ formatDateTime(row.updateTime) }}</template>
          </el-table-column>
        </el-table>

        <Pagination
          v-show="tradeTotal > 0"
          v-model:page="tradeQuery.pageNo"
          v-model:limit="tradeQuery.pageSize"
          :total="tradeTotal"
          @pagination="loadTrades"
        />
      </el-tab-pane>
    </el-tabs>
  </ContentWrap>

  <el-dialog
    v-model="formVisible"
    :title="formMode === 'create' ? '录入持仓' : '编辑持仓'"
    width="min(560px, calc(100vw - 24px))"
    destroy-on-close
  >
    <el-form ref="formRef" :model="formData" :rules="formRules" label-width="96px">
      <el-form-item label="持仓股票" prop="stockId">
        <el-select
          v-model="formData.stockId"
          class="w-100%"
          filterable
          :disabled="formMode === 'edit'"
          placeholder="选择当前个股池中的股票"
        >
          <el-option
            v-for="track in availableTracks"
            :key="track.stockId"
            :label="`${track.name}（${track.symbol}）`"
            :value="track.stockId"
          />
        </el-select>
      </el-form-item>
      <el-form-item label="持仓数量" prop="quantity">
        <el-input-number
          v-model="formData.quantity"
          class="w-100%"
          :min="0"
          :step="100"
          :precision="4"
          controls-position="right"
        />
      </el-form-item>
      <el-form-item label="平均成本" prop="averageCostPrice">
        <el-input-number
          v-model="formData.averageCostPrice"
          class="w-100%"
          :min="0.001"
          :step="0.001"
          :precision="MONEY_PRECISION"
          controls-position="right"
        />
      </el-form-item>
      <el-form-item label="建仓日期" prop="openedDate">
        <el-date-picker
          v-model="formData.openedDate"
          class="w-100%"
          type="date"
          value-format="YYYY-MM-DD"
          :clearable="false"
          :disabled-date="disableFutureDate"
        />
      </el-form-item>
      <el-form-item label="备注" prop="remark">
        <el-input
          v-model="formData.remark"
          type="textarea"
          :rows="3"
          maxlength="500"
          show-word-limit
          placeholder="记录持仓计划或数据来源"
        />
      </el-form-item>
    </el-form>
    <template #footer>
      <el-button @click="formVisible = false">取消</el-button>
      <el-button type="primary" :loading="submitLoading" @click="submitPosition">保存</el-button>
    </template>
  </el-dialog>

  <el-dialog
    v-model="assetFormVisible"
    title="总资产设置"
    width="min(480px, calc(100vw - 24px))"
    destroy-on-close
  >
    <el-form ref="assetFormRef" :model="assetFormData" :rules="assetFormRules" label-width="88px">
      <el-form-item label="总资产" prop="totalAsset">
        <el-input
          v-model="assetFormData.totalAsset"
          inputmode="decimal"
          maxlength="21"
          placeholder="请输入总资产"
        >
          <template #append>元</template>
        </el-input>
      </el-form-item>
    </el-form>
    <template #footer>
      <el-button @click="assetFormVisible = false">取消</el-button>
      <el-button type="primary" :loading="assetSubmitLoading" @click="submitAssetAccount"
        >保存</el-button
      >
    </template>
  </el-dialog>

  <StockPortfolioImportDialog ref="importDialogRef" @success="handleImportSuccess" />
  <StockDetailDrawer ref="detailRef" @changed="refreshAll" />
</template>

<script setup lang="ts">
import Decimal from 'decimal.js'
import dayjs from 'dayjs'
import { Search } from '@element-plus/icons-vue'
import type { FormInstance, FormRules } from 'element-plus'
import { FinanceMarket, MarketDataStatus, StockApi, StockTrackVO } from '@/api/finance/stock'
import {
  StockClosedPositionVO,
  StockPositionAccountVO,
  StockPositionApi,
  StockPositionCreateVO,
  StockPositionUpdateVO,
  StockPositionVO
} from '@/api/finance/stock/position'
import {
  StockTradeRecordApi,
  StockTradeRecordPageParams,
  StockTradeRecordSummaryVO,
  StockTradeRecordVO,
  StockTradeType
} from '@/api/finance/stock/trade-record'
import StockDetailDrawer from '../components/StockDetailDrawer.vue'
import StockPortfolioImportDialog from './components/StockPortfolioImportDialog.vue'

defineOptions({ name: 'FinanceStockPosition' })

type ActiveTab = 'positions' | 'closed' | 'trades'
type PositionView = 'overview' | 'performance' | 'all'
type SortOrder = 'ascending' | 'descending' | null
type SortValue = number | string | null | undefined
type QuoteState = MarketDataStatus | 'SNAPSHOT' | 'NOT_TRACKED' | 'NOT_LOADED'

interface SortChange {
  prop: string
  order: SortOrder
}

interface PositionFormData {
  id: number
  stockId: number | undefined
  quantity: number | undefined
  averageCostPrice: number | undefined
  openedDate: string
  remark: string
}

interface AssetFormData {
  totalAsset: string
}

interface PositionRow extends StockPositionVO {
  track?: StockTrackVO
  costAmount: number
  valuationAmount: number | null
  effectiveHoldingProfitLoss: number | null
  effectiveHoldingProfitRate: number | null
  effectivePositionRatio: number | null
  quoteStatus: QuoteState
}

const message = useMessage()
const MONEY_PRECISION = 3
const tradeTypeLabels: Record<StockTradeType, string> = {
  BUY: '买入',
  SELL: '卖出',
  BANK_DEPOSIT: '银行转存',
  BANK_WITHDRAWAL: '银行转取',
  EX_DIVIDEND: '除权除息',
  DIVIDEND_TAX: '股息个税',
  SECURITY_TRANSFER_IN: '证券转入',
  SECURITY_TRANSFER_OUT: '证券转出',
  NEW_SHARE_CREDIT: '新股到账'
}
const tradeTypeTagTypes: Record<
  StockTradeType,
  'primary' | 'danger' | 'success' | 'info' | 'warning'
> = {
  BUY: 'danger',
  SELL: 'success',
  BANK_DEPOSIT: 'info',
  BANK_WITHDRAWAL: 'warning',
  EX_DIVIDEND: 'primary',
  DIVIDEND_TAX: 'warning',
  SECURITY_TRANSFER_IN: 'success',
  SECURITY_TRANSFER_OUT: 'info',
  NEW_SHARE_CREDIT: 'primary'
}
const loading = ref(false)
const quoteLoading = ref(false)
const tradeLoading = ref(false)
const submitLoading = ref(false)
const assetSubmitLoading = ref(false)
const activeTab = ref<ActiveTab>('positions')
const positionView = ref<PositionView>('overview')
const positionKeyword = ref('')
const closedKeyword = ref('')
const closedDateRange = ref<[string, string] | null>(null)
const rows = ref<PositionRow[]>([])
const closedRows = ref<StockClosedPositionVO[]>([])
const tracks = ref<StockTrackVO[]>([])
const assetAccount = ref<StockPositionAccountVO | null>(null)
const formVisible = ref(false)
const assetFormVisible = ref(false)
const formMode = ref<'create' | 'edit'>('create')
const formRef = ref<FormInstance>()
const assetFormRef = ref<FormInstance>()
const detailRef = ref<InstanceType<typeof StockDetailDrawer>>()
const importDialogRef = ref<InstanceType<typeof StockPortfolioImportDialog>>()
const positionSort = reactive<{ prop: string; order: SortOrder }>({ prop: '', order: null })
const closedSort = reactive<{ prop: string; order: SortOrder }>({ prop: '', order: null })
const tradesLoaded = ref(false)
const tradeRecords = ref<StockTradeRecordVO[]>([])
const tradeTotal = ref(0)
const tradeSummary = ref<StockTradeRecordSummaryVO>({
  recordCount: 0,
  buyTradeAmount: '0',
  sellTradeAmount: '0',
  totalFee: '0',
  netCashFlow: '0'
})
const tradeQuery = reactive<StockTradeRecordPageParams>({ pageNo: 1, pageSize: 20 })
const tradeDateRange = ref<[string, string] | null>(null)

const formData = reactive<PositionFormData>({
  id: 0,
  stockId: undefined,
  quantity: undefined,
  averageCostPrice: undefined,
  openedDate: dayjs().format('YYYY-MM-DD'),
  remark: ''
})
const assetFormData = reactive<AssetFormData>({ totalAsset: '' })

const positionViewOptions = [
  { label: '持仓概览', value: 'overview' },
  { label: '收益周期', value: 'performance' },
  { label: '全部字段', value: 'all' }
]

const overviewColumns = new Set([
  'holdingAmount',
  'dailyProfitLoss',
  'dailyProfitRate',
  'holdingProfitLoss',
  'holdingProfitRate',
  'positionRatio',
  'quantity',
  'holdingDays',
  'latestChangeRate',
  'latestPrice',
  'averageCostPrice',
  'relatedSector',
  'openedDate',
  'importTime'
])
const performanceColumns = new Set([
  'dailyProfitLoss',
  'dailyProfitRate',
  'portfolioProfitLoss',
  'portfolioChangeRate',
  'holdingProfitLoss',
  'holdingProfitRate',
  'cumulativeProfitLoss',
  'cumulativeProfitRate',
  'weeklyProfitLoss',
  'monthlyProfitLoss',
  'yearlyProfitLoss',
  'latestChangeRate',
  'breakEvenChangeRate',
  'oneMonthChangeRate',
  'threeMonthChangeRate',
  'sixMonthChangeRate',
  'oneYearChangeRate'
])

const formRules: FormRules<PositionFormData> = {
  stockId: [{ required: true, message: '请选择持仓股票', trigger: 'change' }],
  quantity: [{ required: true, message: '请输入持仓数量', trigger: 'blur' }],
  averageCostPrice: [{ required: true, message: '请输入平均成本价', trigger: 'blur' }],
  openedDate: [{ required: true, message: '请选择建仓日期', trigger: 'change' }]
}
const assetPattern = /^(?:0|[1-9]\d{0,16})(?:\.\d{1,3})?$/
const assetFormRules: FormRules<AssetFormData> = {
  totalAsset: [
    { required: true, message: '请输入总资产', trigger: 'blur' },
    { pattern: assetPattern, message: '请输入非负金额，最多 17 位整数和 3 位小数', trigger: 'blur' }
  ]
}

const quoteStatusLabels: Record<QuoteState, string> = {
  REALTIME: '实时行情',
  DELAYED: '延时行情',
  CACHED: '缓存行情',
  UNAVAILABLE: '行情异常',
  SNAPSHOT: 'Excel 快照',
  NOT_TRACKED: '未在个股池',
  NOT_LOADED: '手工数据'
}
const quoteStatusTypes: Record<QuoteState, 'success' | 'warning' | 'info' | 'danger'> = {
  REALTIME: 'success',
  DELAYED: 'warning',
  CACHED: 'info',
  UNAVAILABLE: 'danger',
  SNAPSHOT: 'info',
  NOT_TRACKED: 'warning',
  NOT_LOADED: 'info'
}

const positionSortGetters: Record<string, (row: PositionRow) => SortValue> = {
  name: (row) => `${row.name}${row.symbol}`,
  holdingAmount: (row) => row.valuationAmount,
  dailyProfitLoss: (row) => row.dailyProfitLoss,
  dailyProfitRate: (row) => row.dailyProfitRate,
  portfolioProfitLoss: (row) => row.portfolioProfitLoss,
  portfolioChangeRate: (row) => row.portfolioChangeRate,
  holdingProfitLoss: (row) => row.effectiveHoldingProfitLoss,
  holdingProfitRate: (row) => row.effectiveHoldingProfitRate,
  cumulativeProfitLoss: (row) => row.cumulativeProfitLoss,
  cumulativeProfitRate: (row) => row.cumulativeProfitRate,
  weeklyProfitLoss: (row) => row.weeklyProfitLoss,
  monthlyProfitLoss: (row) => row.monthlyProfitLoss,
  yearlyProfitLoss: (row) => row.yearlyProfitLoss,
  positionRatio: (row) => row.effectivePositionRatio,
  quantity: (row) => row.quantity,
  holdingDays: (row) => row.holdingDays,
  latestChangeRate: (row) => row.latestChangeRate,
  latestPrice: (row) => row.latestPrice,
  averageCostPrice: (row) => row.averageCostPrice,
  breakEvenChangeRate: (row) => row.breakEvenChangeRate,
  oneMonthChangeRate: (row) => row.oneMonthChangeRate,
  threeMonthChangeRate: (row) => row.threeMonthChangeRate,
  sixMonthChangeRate: (row) => row.sixMonthChangeRate,
  oneYearChangeRate: (row) => row.oneYearChangeRate,
  relatedSector: (row) => row.relatedSector,
  sectorChangeRate: (row) => row.sectorChangeRate,
  openedDate: (row) => row.openedDate,
  importTime: (row) => row.importTime
}

const closedSortGetters: Record<string, (row: StockClosedPositionVO) => SortValue> = {
  name: (row) => `${row.name ?? ''}${row.code ?? ''}`,
  closedDate: (row) => row.closedDate,
  totalProfitLoss: (row) => row.totalProfitLoss,
  profitRate: (row) => row.profitRate,
  benchmarkChangeRate: (row) => row.benchmarkChangeRate,
  excessReturnRate: (row) => row.excessReturnRate,
  buyAveragePrice: (row) => row.buyAveragePrice,
  sellAveragePrice: (row) => row.sellAveragePrice,
  holdingDays: (row) => row.holdingDays,
  daysSinceClosed: (row) => row.daysSinceClosed,
  tradingFee: (row) => row.tradingFee,
  openedDate: (row) => row.openedDate,
  updateTime: (row) => row.updateTime
}

const availableTracks = computed(() => {
  const occupiedStockIds = new Set(rows.value.map((row) => row.stockId))
  return tracks.value.filter(
    (track) => !occupiedStockIds.has(track.stockId) || track.stockId === formData.stockId
  )
})

const filteredPositionRows = computed(() => {
  const keyword = positionKeyword.value.trim().toLocaleLowerCase()
  if (!keyword) return rows.value
  return rows.value.filter((row) =>
    `${row.name} ${row.symbol} ${row.relatedSector ?? ''}`.toLocaleLowerCase().includes(keyword)
  )
})
const displayPositionRows = computed(() =>
  sortRows(filteredPositionRows.value, positionSort, positionSortGetters)
)

const filteredClosedRows = computed(() => {
  const keyword = closedKeyword.value.trim().toLocaleLowerCase()
  const [beginDate, endDate] = closedDateRange.value ?? []
  return closedRows.value.filter((row) => {
    const matchesKeyword =
      !keyword || `${row.name ?? ''} ${row.code ?? ''}`.toLocaleLowerCase().includes(keyword)
    const matchesBeginDate = !beginDate || row.closedDate >= beginDate
    const matchesEndDate = !endDate || row.closedDate <= endDate
    return matchesKeyword && matchesBeginDate && matchesEndDate
  })
})
const displayClosedRows = computed(() =>
  sortRows(filteredClosedRows.value, closedSort, closedSortGetters)
)

const summary = computed(() => {
  let holdingAmount = new Decimal(0)
  let holdingProfitLoss = new Decimal(0)
  let dailyProfitLoss = new Decimal(0)
  let missingValuationCount = 0
  let risingCount = 0
  let fallingCount = 0
  rows.value.forEach((row) => {
    if (row.valuationAmount === null) missingValuationCount++
    else holdingAmount = holdingAmount.plus(row.valuationAmount)
    if (row.effectiveHoldingProfitLoss !== null)
      holdingProfitLoss = holdingProfitLoss.plus(row.effectiveHoldingProfitLoss)
    if (row.dailyProfitLoss !== null) dailyProfitLoss = dailyProfitLoss.plus(row.dailyProfitLoss)
    if ((row.dailyProfitRate ?? 0) > 0) risingCount++
    if ((row.dailyProfitRate ?? 0) < 0) fallingCount++
  })
  const totalAsset = assetAccount.value?.totalAsset ?? null
  const availableAsset =
    totalAsset === null || missingValuationCount > 0
      ? null
      : new Decimal(totalAsset).minus(holdingAmount).toDecimalPlaces(MONEY_PRECISION).toNumber()
  const positionRatio =
    totalAsset && !new Decimal(totalAsset).isZero()
      ? holdingAmount.dividedBy(totalAsset).times(100).toDecimalPlaces(2).toNumber()
      : sumOptional(rows.value.map((row) => row.effectivePositionRatio))
  const importTimes = rows.value
    .map((row) => row.importTime)
    .filter((value): value is string => Boolean(value))
  return {
    totalAsset,
    availableAsset,
    holdingAmount: holdingAmount.toDecimalPlaces(MONEY_PRECISION).toNumber(),
    holdingProfitLoss: holdingProfitLoss.toDecimalPlaces(MONEY_PRECISION).toNumber(),
    dailyProfitLoss: dailyProfitLoss.toDecimalPlaces(MONEY_PRECISION).toNumber(),
    positionRatio,
    positionCount: rows.value.length,
    risingCount,
    fallingCount,
    missingValuationCount,
    latestImportTime: importTimes.sort().at(-1) ?? null
  }
})

const closedSummary = computed(() => {
  const values = filteredClosedRows.value
  const profitRows = values.filter((row) => row.totalProfitLoss !== null)
  const wins = profitRows.filter((row) => (row.totalProfitLoss ?? 0) > 0).length
  return {
    count: values.length,
    winRate: profitRows.length
      ? new Decimal(wins).dividedBy(profitRows.length).times(100).toNumber()
      : null,
    totalProfitLoss: sumOptional(values.map((row) => row.totalProfitLoss)) ?? 0,
    averageExcessReturn: averageOptional(values.map((row) => row.excessReturnRate)),
    averageHoldingDays: averageOptional(values.map((row) => row.holdingDays))
  }
})

const showPositionColumn = (key: string) => {
  if (positionView.value === 'all') return true
  return (positionView.value === 'overview' ? overviewColumns : performanceColumns).has(key)
}

const buildPositionRow = (
  position: StockPositionVO,
  trackMap: Map<number, StockTrackVO>,
  totalAsset: number | null
): PositionRow => {
  const costAmount = new Decimal(position.quantity)
    .times(position.averageCostPrice)
    .toDecimalPlaces(MONEY_PRECISION)
  const valuationAmount =
    position.holdingAmount ??
    (position.latestPrice === null
      ? null
      : new Decimal(position.quantity)
          .times(position.latestPrice)
          .toDecimalPlaces(MONEY_PRECISION)
          .toNumber())
  const holdingProfitLoss =
    position.holdingProfitLoss ??
    (valuationAmount === null
      ? null
      : new Decimal(valuationAmount).minus(costAmount).toDecimalPlaces(MONEY_PRECISION).toNumber())
  const holdingProfitRate =
    position.holdingProfitRate ??
    (holdingProfitLoss === null || costAmount.isZero()
      ? null
      : new Decimal(holdingProfitLoss)
          .dividedBy(costAmount)
          .times(100)
          .toDecimalPlaces(2)
          .toNumber())
  const positionRatio =
    position.positionRatio ??
    (valuationAmount === null || totalAsset === null || new Decimal(totalAsset).isZero()
      ? null
      : new Decimal(valuationAmount).dividedBy(totalAsset).times(100).toDecimalPlaces(2).toNumber())
  const track = trackMap.get(position.stockId)
  return {
    ...position,
    track,
    costAmount: costAmount.toNumber(),
    valuationAmount,
    effectiveHoldingProfitLoss: holdingProfitLoss,
    effectiveHoldingProfitRate: holdingProfitRate,
    effectivePositionRatio: positionRatio,
    quoteStatus: position.importTime ? 'SNAPSHOT' : track ? 'NOT_LOADED' : 'NOT_TRACKED'
  }
}

const loadData = async () => {
  loading.value = true
  try {
    const [positionList, closedList, trackList, account] = await Promise.all([
      StockPositionApi.getList(),
      StockPositionApi.getClosedList(),
      StockApi.getTrackList(),
      StockPositionApi.getAccount()
    ])
    tracks.value = trackList
    closedRows.value = closedList
    assetAccount.value = account
    const trackMap = new Map(trackList.map((track) => [track.stockId, track]))
    rows.value = positionList.map((position) =>
      buildPositionRow(position, trackMap, account?.totalAsset ?? null)
    )
  } finally {
    loading.value = false
  }
}

const loadTrades = async () => {
  tradeLoading.value = true
  try {
    const [beginDate, endDate] = tradeDateRange.value ?? []
    const params: StockTradeRecordPageParams = {
      ...tradeQuery,
      beginDate,
      endDate
    }
    const [page, totals] = await Promise.all([
      StockTradeRecordApi.getPage(params),
      StockTradeRecordApi.getSummary(params)
    ])
    tradeRecords.value = page.list
    tradeTotal.value = page.total
    tradeSummary.value = totals
    tradesLoaded.value = true
  } finally {
    tradeLoading.value = false
  }
}

const refreshAll = async () => {
  await loadData()
  if (tradesLoaded.value) await loadTrades()
}

const refreshQuotes = async () => {
  const refreshableRows = rows.value.filter((row) => row.track)
  if (!refreshableRows.length) {
    message.warning('当前持仓没有可刷新的个股池股票')
    return
  }
  quoteLoading.value = true
  let successCount = 0
  try {
    const totalAsset = assetAccount.value?.totalAsset ?? null
    rows.value = await Promise.all(
      rows.value.map(async (row) => {
        if (!row.track) return row
        try {
          const quote = await StockApi.getQuote(row.track.id)
          if (!quote.data) return { ...row, quoteStatus: quote.status }
          successCount++
          const valuationAmount = new Decimal(row.quantity)
            .times(quote.data.latestPrice)
            .toDecimalPlaces(MONEY_PRECISION)
          const holdingProfitLoss = valuationAmount
            .minus(row.costAmount)
            .toDecimalPlaces(MONEY_PRECISION)
          const holdingProfitRate = new Decimal(row.costAmount).isZero()
            ? null
            : holdingProfitLoss.dividedBy(row.costAmount).times(100).toDecimalPlaces(2).toNumber()
          const positionRatio =
            totalAsset === null || new Decimal(totalAsset).isZero()
              ? null
              : valuationAmount.dividedBy(totalAsset).times(100).toDecimalPlaces(2).toNumber()
          return {
            ...row,
            latestPrice: quote.data.latestPrice,
            latestChangeRate: quote.data.changePercent,
            dailyProfitLoss: new Decimal(quote.data.changeAmount)
              .times(row.quantity)
              .toDecimalPlaces(MONEY_PRECISION)
              .toNumber(),
            dailyProfitRate: quote.data.changePercent,
            valuationAmount: valuationAmount.toNumber(),
            effectiveHoldingProfitLoss: holdingProfitLoss.toNumber(),
            effectiveHoldingProfitRate: holdingProfitRate,
            effectivePositionRatio: positionRatio,
            quoteStatus: quote.status
          }
        } catch {
          return { ...row, quoteStatus: 'UNAVAILABLE' as const }
        }
      })
    )
    message.success(`已刷新 ${successCount} / ${refreshableRows.length} 只股票行情`)
  } finally {
    quoteLoading.value = false
  }
}

const resetForm = () => {
  formData.id = 0
  formData.stockId = undefined
  formData.quantity = undefined
  formData.averageCostPrice = undefined
  formData.openedDate = dayjs().format('YYYY-MM-DD')
  formData.remark = ''
  formRef.value?.clearValidate()
}
const openCreate = () => {
  resetForm()
  formMode.value = 'create'
  formVisible.value = true
}
const openEdit = (row: PositionRow) => {
  formMode.value = 'edit'
  Object.assign(formData, {
    id: row.id,
    stockId: row.stockId,
    quantity: row.quantity,
    averageCostPrice: row.averageCostPrice,
    openedDate: row.openedDate,
    remark: row.remark ?? ''
  })
  formVisible.value = true
}

const openAssetForm = async () => {
  assetFormData.totalAsset =
    assetAccount.value === null
      ? ''
      : new Decimal(assetAccount.value.totalAsset).toFixed(MONEY_PRECISION)
  assetFormVisible.value = true
  await nextTick()
  assetFormRef.value?.clearValidate()
}

const submitAssetAccount = async () => {
  if (!(await assetFormRef.value?.validate().catch(() => false))) return
  assetSubmitLoading.value = true
  try {
    await StockPositionApi.saveAccount({
      totalAsset: new Decimal(assetFormData.totalAsset).toFixed(MONEY_PRECISION)
    })
    assetFormVisible.value = false
    message.success('总资产已保存')
    await loadData()
  } finally {
    assetSubmitLoading.value = false
  }
}

const submitPosition = async () => {
  const valid = await formRef.value?.validate().catch(() => false)
  if (
    !valid ||
    formData.stockId === undefined ||
    formData.quantity === undefined ||
    formData.averageCostPrice === undefined
  )
    return
  submitLoading.value = true
  try {
    const payload: StockPositionCreateVO = {
      stockId: formData.stockId,
      quantity: formData.quantity,
      averageCostPrice: formData.averageCostPrice,
      openedDate: formData.openedDate,
      remark: formData.remark.trim() || undefined
    }
    if (formMode.value === 'create') {
      await StockPositionApi.create(payload)
      message.success('持仓已录入')
    } else {
      await StockPositionApi.update({ ...payload, id: formData.id } as StockPositionUpdateVO)
      message.success('持仓已更新')
    }
    formVisible.value = false
    await loadData()
  } finally {
    submitLoading.value = false
  }
}

const handleDelete = async (row: PositionRow) => {
  await message.delConfirm(`确定删除“${row.name}（${row.symbol}）”的持仓记录吗？`)
  await StockPositionApi.delete(row.id)
  message.success('持仓已删除')
  await loadData()
}

const handleImportSuccess = async () => {
  tradesLoaded.value = false
  await loadData()
  if (activeTab.value === 'trades') await loadTrades()
}
const openDetail = (row: PositionRow) => {
  if (row.track) detailRef.value?.open(row.track)
}
const handlePositionSort = ({ prop, order }: SortChange) =>
  Object.assign(positionSort, { prop, order })
const handleClosedSort = ({ prop, order }: SortChange) => Object.assign(closedSort, { prop, order })
const handleTradeSort = ({ prop, order }: SortChange) => {
  tradeQuery.sortField = order ? prop : undefined
  tradeQuery.sortOrder = order ?? undefined
  tradeQuery.pageNo = 1
  loadTrades()
}
const handleTradeQuery = () => {
  tradeQuery.pageNo = 1
  loadTrades()
}

watch(activeTab, (tab) => {
  if (tab === 'trades' && !tradesLoaded.value) loadTrades()
})

const sortRows = <T,>(
  source: T[],
  state: { prop: string; order: SortOrder },
  getters: Record<string, (row: T) => SortValue>
) => {
  if (!state.prop || !state.order || !getters[state.prop]) return source
  const getter = getters[state.prop]
  const direction = state.order === 'ascending' ? 1 : -1
  return source
    .map((row, index) => ({ row, index }))
    .sort((left, right) => {
      const leftValue = getter(left.row)
      const rightValue = getter(right.row)
      const leftEmpty = leftValue === null || leftValue === undefined || leftValue === ''
      const rightEmpty = rightValue === null || rightValue === undefined || rightValue === ''
      if (leftEmpty && rightEmpty) return left.index - right.index
      if (leftEmpty) return 1
      if (rightEmpty) return -1
      const comparison =
        typeof leftValue === 'number' && typeof rightValue === 'number'
          ? leftValue - rightValue
          : String(leftValue).localeCompare(String(rightValue), 'zh-CN', { numeric: true })
      return comparison === 0 ? left.index - right.index : comparison * direction
    })
    .map((item) => item.row)
}

const sumOptional = (values: Array<number | null | undefined>) => {
  const usable = values.filter((value): value is number => value !== null && value !== undefined)
  return usable.length
    ? usable.reduce((sum, value) => sum.plus(value), new Decimal(0)).toNumber()
    : null
}
const averageOptional = (values: Array<number | null | undefined>) => {
  const usable = values.filter((value): value is number => value !== null && value !== undefined)
  return usable.length
    ? new Decimal(sumOptional(usable) ?? 0).dividedBy(usable.length).toDecimalPlaces(2).toNumber()
    : null
}

const disableFutureDate = (date: Date) => dayjs(date).isAfter(dayjs(), 'day')
const toNumber = (value?: string | number | null) =>
  value === null || value === undefined || value === '' ? null : Number(value)
const formatPrice = (value?: number | null) =>
  value === undefined || value === null ? '--' : Number(value).toFixed(MONEY_PRECISION)
const formatAmount = (value?: number | null) =>
  value === undefined || value === null
    ? '--'
    : Number(value).toLocaleString('zh-CN', {
        minimumFractionDigits: MONEY_PRECISION,
        maximumFractionDigits: MONEY_PRECISION
      })
const formatSignedAmount = (value?: number | null) =>
  value === undefined || value === null
    ? '--'
    : `${Number(value) > 0 ? '+' : ''}${formatAmount(Number(value))}`
const formatPercent = (value?: number | null) =>
  value === undefined || value === null
    ? '--'
    : `${Number(value) > 0 ? '+' : ''}${Number(value).toFixed(2)}%`
const formatQuantity = (value?: number | null) =>
  value === undefined || value === null
    ? '--'
    : Number(value).toLocaleString('zh-CN', { maximumFractionDigits: 4 })
const formatDateTime = (value?: string | null) =>
  value ? dayjs(value).format('YYYY-MM-DD HH:mm:ss') : '--'
const formatShortDateTime = (value: string) => dayjs(value).format('MM-DD HH:mm')
const formatTradeTime = (value?: string | null) => (value ? value.slice(0, 8) : '--')
const formatDays = (value?: number | null) =>
  value === undefined || value === null ? '--' : `${Number(value).toFixed(1)} 天`
const formatMoneyText = (value?: string | number | null) =>
  value === null || value === undefined ? '--' : formatAmount(Number(value))
const formatSignedMoneyText = (value?: string | number | null) =>
  value === null || value === undefined ? '--' : formatSignedAmount(Number(value))
const getPositionSummaries = ({ columns, data }: SummaryMethodProps) => {
  const positionRows = data as PositionRow[]
  const summaryGetters: Record<string, () => string> = {
    holdingAmount: () => formatAmount(sumOptional(positionRows.map((row) => row.valuationAmount))),
    dailyProfitLoss: () =>
      formatSignedAmount(sumOptional(positionRows.map((row) => row.dailyProfitLoss))),
    portfolioProfitLoss: () =>
      formatSignedAmount(sumOptional(positionRows.map((row) => row.portfolioProfitLoss))),
    holdingProfitLoss: () =>
      formatSignedAmount(sumOptional(positionRows.map((row) => row.effectiveHoldingProfitLoss))),
    cumulativeProfitLoss: () =>
      formatSignedAmount(sumOptional(positionRows.map((row) => row.cumulativeProfitLoss))),
    weeklyProfitLoss: () =>
      formatSignedAmount(sumOptional(positionRows.map((row) => row.weeklyProfitLoss))),
    monthlyProfitLoss: () =>
      formatSignedAmount(sumOptional(positionRows.map((row) => row.monthlyProfitLoss))),
    yearlyProfitLoss: () =>
      formatSignedAmount(sumOptional(positionRows.map((row) => row.yearlyProfitLoss))),
    positionRatio: () =>
      formatPercent(sumOptional(positionRows.map((row) => row.effectivePositionRatio))),
    quantity: () => formatQuantity(sumOptional(positionRows.map((row) => row.quantity)))
  }
  return columns.map((column, index) => {
    if (index === 0) return '当前结果合计'
    return summaryGetters[column.property]?.() ?? ''
  })
}
const stockSymbol = (market?: FinanceMarket | null, code?: string | null) =>
  market && code ? `${market}:${code}` : code || '--'
const changeClass = (value?: number | null) =>
  value === undefined || value === null || Number(value) === 0
    ? 'profit-flat'
    : Number(value) > 0
      ? 'profit-up'
      : 'profit-down'

onMounted(loadData)
</script>

<style scoped>
.portfolio-header,
.portfolio-title,
.portfolio-actions,
.view-toolbar,
.summary-metric__label,
.row-actions,
.source-state {
  display: flex;
  align-items: center;
}

.portfolio-header {
  justify-content: space-between;
  gap: 16px;
}

.portfolio-title {
  min-width: 0;
  gap: 10px;
}

.portfolio-title h1 {
  margin: 0;
  font-size: 20px;
  line-height: 1.3;
  letter-spacing: 0;
}

.portfolio-title p {
  margin: 4px 0 0;
  font-size: 12px;
  color: var(--el-text-color-secondary);
}

.portfolio-actions {
  flex-wrap: wrap;
  justify-content: flex-end;
  gap: 8px;
}

.portfolio-actions .el-button {
  margin-left: 0;
}

.portfolio-summary {
  display: grid;
  grid-template-columns: repeat(4, minmax(0, 1fr));
  margin-top: 18px;
  overflow: hidden;
  border: 1px solid var(--el-border-color-light);
  border-radius: 4px;
}

.summary-metric {
  display: flex;
  min-width: 0;
  min-height: 74px;
  padding: 12px 16px;
  flex-direction: column;
  justify-content: center;
  border-top: 1px solid var(--el-border-color-lighter);
  border-left: 1px solid var(--el-border-color-lighter);
}

.summary-metric:nth-child(-n + 4) {
  border-top: 0;
}

.summary-metric:nth-child(4n + 1) {
  border-left: 0;
}

.summary-metric--asset {
  box-shadow: inset 0 3px var(--el-color-primary);
}

.summary-metric--cash {
  box-shadow: inset 0 3px #2c8c73;
}

.summary-metric > span,
.summary-metric__label {
  margin-bottom: 5px;
  font-size: 12px;
  color: var(--el-text-color-secondary);
}

.summary-metric__label {
  justify-content: space-between;
}

.summary-metric__label .el-button {
  width: 24px;
  height: 24px;
  padding: 0;
}

.summary-metric strong {
  overflow: hidden;
  font-size: 19px;
  text-overflow: ellipsis;
  white-space: nowrap;
  font-variant-numeric: tabular-nums;
}

.portfolio-tabs :deep(.el-tabs__header) {
  margin-bottom: 14px;
}

.view-toolbar {
  min-height: 36px;
  margin-bottom: 14px;
  flex-wrap: wrap;
  gap: 10px;
}

.keyword-input {
  width: 280px;
  max-width: 100%;
}

.trade-type {
  width: 120px;
}

.filter-date-range {
  width: 260px;
  max-width: 100%;
}

.toolbar-spacer {
  flex: 1;
}

.result-context {
  font-size: 12px;
  color: var(--el-text-color-secondary);
}

.stock-link {
  display: block;
  max-width: 100%;
  padding: 0;
  color: inherit;
  text-align: left;
  cursor: pointer;
  background: transparent;
  border: 0;
}

.stock-link:disabled {
  cursor: default;
}

.stock-link span,
.stock-name {
  font-weight: 600;
  color: var(--el-text-color-primary);
}

.stock-link small,
.stock-code {
  display: block;
  margin-top: 2px;
  font-size: 12px;
  color: var(--el-text-color-secondary);
  font-variant-numeric: tabular-nums;
}

.stock-link:not(:disabled):hover span {
  color: var(--el-color-primary);
}

.row-actions {
  justify-content: center;
  gap: 8px;
}

.row-actions .el-button {
  width: 28px;
  height: 28px;
  padding: 0;
  margin-left: 0;
}

.source-state {
  align-items: flex-start;
  flex-direction: column;
  gap: 3px;
}

.source-state small {
  font-size: 11px;
  color: var(--el-text-color-secondary);
}

.compact-summary {
  display: grid;
  grid-template-columns: repeat(5, minmax(0, 1fr));
  margin-bottom: 14px;
  overflow: hidden;
  border: 1px solid var(--el-border-color-lighter);
  border-radius: 4px;
}

.compact-summary section {
  min-width: 0;
  padding: 10px 14px;
  border-left: 1px solid var(--el-border-color-lighter);
}

.compact-summary section:first-child {
  border-left: 0;
}

.compact-summary span,
.compact-summary strong {
  display: block;
}

.compact-summary span {
  margin-bottom: 4px;
  font-size: 12px;
  color: var(--el-text-color-secondary);
}

.compact-summary strong {
  overflow: hidden;
  font-size: 16px;
  text-overflow: ellipsis;
  white-space: nowrap;
  font-variant-numeric: tabular-nums;
}

.profit-up {
  font-weight: 600;
  color: #c73535;
  font-variant-numeric: tabular-nums;
}

.profit-down {
  font-weight: 600;
  color: #17805d;
  font-variant-numeric: tabular-nums;
}

.profit-flat {
  color: var(--el-text-color-regular);
  font-variant-numeric: tabular-nums;
}

@media (width <= 900px) {
  .portfolio-summary {
    grid-template-columns: repeat(2, minmax(0, 1fr));
  }

  .summary-metric:nth-child(n) {
    border-top: 1px solid var(--el-border-color-lighter);
    border-left: 1px solid var(--el-border-color-lighter);
  }

  .summary-metric:nth-child(-n + 2) {
    border-top: 0;
  }

  .summary-metric:nth-child(2n + 1) {
    border-left: 0;
  }

  .compact-summary {
    grid-template-columns: repeat(2, minmax(0, 1fr));
  }

  .compact-summary section:nth-child(n) {
    border-top: 1px solid var(--el-border-color-lighter);
    border-left: 1px solid var(--el-border-color-lighter);
  }

  .compact-summary section:nth-child(-n + 2) {
    border-top: 0;
  }

  .compact-summary section:nth-child(2n + 1) {
    border-left: 0;
  }
}

@media (width <= 720px) {
  .portfolio-header {
    align-items: stretch;
    flex-direction: column;
  }

  .portfolio-actions {
    justify-content: flex-start;
  }

  .portfolio-actions .el-button:not(.is-circle) {
    flex: 1 1 auto;
  }

  .view-toolbar {
    align-items: stretch;
  }

  .keyword-input {
    width: 100%;
  }

  .view-toolbar :deep(.el-segmented) {
    width: 100%;
  }

  .trade-type {
    width: calc(50% - 5px);
  }

  .filter-date-range {
    width: 100%;
  }

  .compact-summary {
    grid-template-columns: 1fr;
  }

  .compact-summary section:nth-child(n) {
    border-top: 1px solid var(--el-border-color-lighter);
    border-left: 0;
  }

  .compact-summary section:first-child {
    border-top: 0;
  }
}
</style>
