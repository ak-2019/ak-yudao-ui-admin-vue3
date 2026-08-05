<template>
  <ContentWrap>
    <div class="guide-header">
      <div class="guide-header__content">
        <div class="guide-header__eyebrow">投资分析使用指南</div>
        <h1 class="guide-header__title">股票分析功能介绍</h1>
        <p class="guide-header__description">
          集中说明股票跟踪、价格维护、详情分析、每日成功率、持仓和成交记录的操作入口与数据口径。
        </p>
      </div>
      <div class="guide-actions">
        <el-button type="primary" @click="goTo('/finance/stock-analysis')">
          <Icon icon="ep:data-analysis" class="mr-5px" />
          前往股票分析
        </el-button>
        <el-button @click="goTo('/finance/stock-statistics')">
          <Icon icon="ep:data-line" class="mr-5px" />
          前往每日综合统计
        </el-button>
        <el-button @click="goTo('/finance/stock-position')">
          <Icon icon="ep:wallet-filled" class="mr-5px" />
          前往我的持仓
        </el-button>
        <el-button @click="goTo('/finance/stock-trade-record')">
          <Icon icon="ep:list" class="mr-5px" />
          前往成交记录
        </el-button>
      </div>
    </div>
    <el-alert
      type="info"
      :closable="false"
      show-icon
      title="建议先维护跟踪股票与本地价格，再重建每日统计；行情、资讯、研报和基本面属于辅助数据，不影响手工记录。"
    />
  </ContentWrap>

  <ContentWrap>
    <el-tabs v-model="activeTab" class="guide-tabs">
      <el-tab-pane label="股票分析" name="stock">
        <section class="guide-section">
          <div class="section-heading">
            <div>
              <h2 class="section-heading__title">推荐操作流程</h2>
              <p class="section-heading__description">
                从建立跟踪池开始，完成价格数据维护后再查看详情和统计结果。
              </p>
            </div>
          </div>
          <div class="workflow-grid">
            <div v-for="(step, index) in stockWorkflow" :key="step.title" class="workflow-step">
              <span class="workflow-step__index">{{ index + 1 }}</span>
              <div>
                <div class="workflow-step__title">{{ step.title }}</div>
                <div class="workflow-step__description">{{ step.description }}</div>
              </div>
            </div>
          </div>
        </section>

        <section class="guide-section">
          <div class="section-heading">
            <div>
              <h2 class="section-heading__title">工具栏与按钮</h2>
              <p class="section-heading__description">
                批量命令依赖表格勾选；受权限控制的按钮只对具备相应权限的用户显示。
              </p>
            </div>
          </div>
          <div class="guide-table-wrap">
            <el-table :data="stockOperations" border stripe table-layout="fixed">
              <el-table-column label="区域" width="118">
                <template #default="{ row }">
                  <el-tag :type="row.type" effect="plain">{{ row.area }}</el-tag>
                </template>
              </el-table-column>
              <el-table-column prop="name" label="功能 / 按钮" width="170" />
              <el-table-column prop="prerequisite" label="使用前提" min-width="210" />
              <el-table-column prop="operation" label="操作方式" min-width="310" />
              <el-table-column prop="effect" label="结果" min-width="280" />
            </el-table>
          </div>
        </section>

        <section class="guide-section">
          <div class="section-heading">
            <div>
              <h2 class="section-heading__title">跟踪列表字段</h2>
              <p class="section-heading__description">
                除选择框和操作列外，列表字段均可排序；拖动表头左侧图标可调整数据列顺序。
              </p>
            </div>
          </div>
          <div class="guide-table-wrap">
            <el-table :data="stockFields" border stripe table-layout="fixed">
              <el-table-column prop="location" label="所在区域" width="150" />
              <el-table-column prop="field" label="字段" width="180" />
              <el-table-column prop="meaning" label="含义" min-width="380" />
              <el-table-column prop="interaction" label="交互 / 注意事项" min-width="320" />
            </el-table>
          </div>
        </section>

        <section class="guide-section guide-section--last">
          <div class="section-heading">
            <div>
              <h2 class="section-heading__title">股票详情</h2>
              <p class="section-heading__description">
                点击任一股票的“详情”后，在同一抽屉中切换不同数据视图。
              </p>
            </div>
          </div>
          <div class="guide-table-wrap">
            <el-table :data="stockDetailCapabilities" border stripe table-layout="fixed">
              <el-table-column label="详情标签" width="150">
                <template #default="{ row }">
                  <el-tag :type="row.type" effect="plain">{{ row.area }}</el-tag>
                </template>
              </el-table-column>
              <el-table-column prop="content" label="展示内容" min-width="350" />
              <el-table-column prop="actions" label="可执行操作" min-width="350" />
              <el-table-column prop="note" label="数据说明" min-width="300" />
            </el-table>
          </div>
        </section>
      </el-tab-pane>

      <el-tab-pane label="每日综合统计" name="statistics">
        <section class="guide-section">
          <div class="section-heading">
            <div>
              <h2 class="section-heading__title">统计口径</h2>
              <p class="section-heading__description">
                每日与累计是两套独立指标，样本均按股票数计算，但采用的涨跌幅不同。
              </p>
            </div>
          </div>
          <div class="guide-table-wrap">
            <el-table :data="statisticsDefinitions" border stripe table-layout="fixed">
              <el-table-column label="统计类型" width="150">
                <template #default="{ row }">
                  <el-tag :type="row.type" effect="plain">{{ row.name }}</el-tag>
                </template>
              </el-table-column>
              <el-table-column prop="sample" label="有效样本" min-width="310" />
              <el-table-column prop="calculation" label="涨跌判断" min-width="400" />
              <el-table-column prop="detail" label="节点明细" min-width="270" />
            </el-table>
          </div>
        </section>

        <section class="guide-section">
          <div class="section-heading">
            <div>
              <h2 class="section-heading__title">页面按钮与图表</h2>
              <p class="section-heading__description">
                日期范围同时作用于趋势图和每日明细；重建用于价格或跟踪日期调整后修复快照。
              </p>
            </div>
          </div>
          <div class="guide-table-wrap">
            <el-table :data="statisticsOperations" border stripe table-layout="fixed">
              <el-table-column label="区域" width="118">
                <template #default="{ row }">
                  <el-tag :type="row.type" effect="plain">{{ row.area }}</el-tag>
                </template>
              </el-table-column>
              <el-table-column prop="name" label="功能 / 按钮" width="180" />
              <el-table-column prop="prerequisite" label="使用前提" min-width="220" />
              <el-table-column prop="operation" label="操作方式" min-width="310" />
              <el-table-column prop="effect" label="结果" min-width="300" />
            </el-table>
          </div>
        </section>

        <section class="guide-section">
          <div class="section-heading">
            <div>
              <h2 class="section-heading__title">每日明细字段</h2>
              <p class="section-heading__description">
                所有非操作字段均支持升序和降序排列，空值无论排序方向都排在有效值之后。
              </p>
            </div>
          </div>
          <div class="guide-table-wrap">
            <el-table :data="statisticsFields" border stripe table-layout="fixed">
              <el-table-column prop="field" label="字段" width="180" />
              <el-table-column prop="meaning" label="含义" min-width="420" />
              <el-table-column prop="interaction" label="交互 / 注意事项" min-width="340" />
            </el-table>
          </div>
        </section>

        <section class="guide-section guide-section--last">
          <div class="section-heading">
            <div>
              <h2 class="section-heading__title">逐股明细弹窗</h2>
              <p class="section-heading__description">
                趋势节点以及每日明细行内的日历、趋势图标都会打开对应日期和口径的逐股明细。
              </p>
            </div>
          </div>
          <div class="guide-table-wrap">
            <el-table :data="snapshotDetailFields" border stripe table-layout="fixed">
              <el-table-column prop="field" label="字段 / 区域" width="190" />
              <el-table-column prop="meaning" label="含义" min-width="430" />
              <el-table-column prop="interaction" label="核对方式" min-width="340" />
            </el-table>
          </div>
        </section>
      </el-tab-pane>

      <el-tab-pane label="我的持仓" name="position">
        <section class="guide-section">
          <div class="section-heading">
            <div>
              <h2 class="section-heading__title">持仓维护流程</h2>
              <p class="section-heading__description">
                当前持仓、已清仓和交易流水集中展示，支持三 Sheet Excel 一次导入。
              </p>
            </div>
          </div>
          <div class="workflow-grid">
            <div v-for="(step, index) in positionWorkflow" :key="step.title" class="workflow-step">
              <span class="workflow-step__index">{{ index + 1 }}</span>
              <div>
                <div class="workflow-step__title">{{ step.title }}</div>
                <div class="workflow-step__description">{{ step.description }}</div>
              </div>
            </div>
          </div>
        </section>

        <section class="guide-section">
          <div class="section-heading">
            <div>
              <h2 class="section-heading__title">页面操作</h2>
              <p class="section-heading__description">
                手工录入维护核心持仓，Excel 导入补充完整收益快照、清仓绩效和成交数据。
              </p>
            </div>
          </div>
          <div class="guide-table-wrap">
            <el-table :data="positionOperations" border stripe table-layout="fixed">
              <el-table-column label="区域" width="118">
                <template #default="{ row }">
                  <el-tag :type="row.type" effect="plain">{{ row.area }}</el-tag>
                </template>
              </el-table-column>
              <el-table-column prop="name" label="功能 / 按钮" width="170" />
              <el-table-column prop="prerequisite" label="使用前提" min-width="220" />
              <el-table-column prop="operation" label="操作方式" min-width="310" />
              <el-table-column prop="effect" label="结果" min-width="300" />
            </el-table>
          </div>
        </section>

        <section class="guide-section guide-section--last">
          <div class="section-heading">
            <div>
              <h2 class="section-heading__title">持仓字段与计算</h2>
              <p class="section-heading__description">
                使用列预设切换持仓概览、收益周期和全部字段；Excel 快照刷新后仍可直接恢复。
              </p>
            </div>
          </div>
          <div class="guide-table-wrap">
            <el-table :data="positionFields" border stripe table-layout="fixed">
              <el-table-column prop="field" label="字段" width="180" />
              <el-table-column prop="meaning" label="含义" min-width="430" />
              <el-table-column prop="interaction" label="交互 / 注意事项" min-width="350" />
            </el-table>
          </div>
        </section>
      </el-tab-pane>

      <el-tab-pane label="股票成交记录" name="trade-record">
        <section class="guide-section">
          <div class="section-heading">
            <div>
              <h2 class="section-heading__title">成交记录维护流程</h2>
              <p class="section-heading__description">
                成交记录是独立资金流水，不会自动修改我的持仓、分组、跟踪日期或成功率。
              </p>
            </div>
          </div>
          <div class="workflow-grid">
            <div v-for="(step, index) in tradeWorkflow" :key="step.title" class="workflow-step">
              <span class="workflow-step__index">{{ index + 1 }}</span>
              <div>
                <div class="workflow-step__title">{{ step.title }}</div>
                <div class="workflow-step__description">{{ step.description }}</div>
              </div>
            </div>
          </div>
        </section>

        <section class="guide-section">
          <div class="section-heading">
            <div>
              <h2 class="section-heading__title">页面操作</h2>
              <p class="section-heading__description">
                查询条件同时作用于分页列表和顶部汇总，新增、编辑或删除后会一起刷新。
              </p>
            </div>
          </div>
          <div class="guide-table-wrap">
            <el-table :data="tradeOperations" border stripe table-layout="fixed">
              <el-table-column label="区域" width="118">
                <template #default="{ row }">
                  <el-tag :type="row.type" effect="plain">{{ row.area }}</el-tag>
                </template>
              </el-table-column>
              <el-table-column prop="name" label="功能 / 按钮" width="170" />
              <el-table-column prop="prerequisite" label="使用前提" min-width="220" />
              <el-table-column prop="operation" label="操作方式" min-width="320" />
              <el-table-column prop="effect" label="结果" min-width="300" />
            </el-table>
          </div>
        </section>

        <section class="guide-section guide-section--last">
          <div class="section-heading">
            <div>
              <h2 class="section-heading__title">字段与结算公式</h2>
              <p class="section-heading__description">
                派生金额由后端使用十进制定点数重算，客户端预览只用于提交前核对。
              </p>
            </div>
          </div>
          <div class="guide-table-wrap">
            <el-table :data="tradeFields" border stripe table-layout="fixed">
              <el-table-column prop="field" label="字段" width="180" />
              <el-table-column prop="meaning" label="含义" min-width="430" />
              <el-table-column prop="interaction" label="交互 / 注意事项" min-width="350" />
            </el-table>
          </div>
        </section>
      </el-tab-pane>
    </el-tabs>
  </ContentWrap>
</template>

<script setup lang="ts">
defineOptions({ name: 'FinanceStockGuide' })

type GuideTagType = 'primary' | 'success' | 'warning' | 'info' | 'danger'

interface WorkflowStep {
  title: string
  description: string
}

interface OperationGuide {
  area: string
  name: string
  prerequisite: string
  operation: string
  effect: string
  type: GuideTagType
}

interface FieldGuide {
  field: string
  meaning: string
  interaction: string
  location?: string
}

interface CapabilityGuide {
  area: string
  content: string
  actions: string
  note: string
  type: GuideTagType
}

interface StatisticsDefinition {
  name: string
  sample: string
  calculation: string
  detail: string
  type: GuideTagType
}

const router = useRouter()
const activeTab = ref('stock')

const goTo = (path: string) => router.push(path)

const stockWorkflow: WorkflowStep[] = [
  {
    title: '添加个股池',
    description:
      '按代码、名称或拼音搜索本地股票池和真实行情，可选择多只候选，确认目标分组后逐股添加并查看结果。'
  },
  {
    title: '设置跟踪范围',
    description: '为股票分组，并设置开始跟踪日期和可选的结束日期。'
  },
  {
    title: '维护价格数据',
    description: '按当前分组或勾选股票同步历史 OHLCV，或在股票详情中新增、编辑手工记录。'
  },
  {
    title: '查看股票详情',
    description: '核对多周期 K 线、均线、量能、MACD/KDJ 信号、行情、资讯、研报和基本面。'
  },
  {
    title: '重建统计快照',
    description: '价格或跟踪日期调整后，前往每日综合统计重建历史；非交易日会自动跳过。'
  }
]

const positionWorkflow: WorkflowStep[] = [
  {
    title: '选择维护方式',
    description: '少量调整可手工录入；完整组合直接导入包含三个 Sheet 的 Excel。'
  },
  {
    title: '核对导入结果',
    description: '查看持仓、已清仓和交易记录各自的新增、更新、跳过与失败数量。'
  },
  {
    title: '切换分析视图',
    description: '在当前持仓中使用概览、收益周期或全部字段预设，在另外两个页签核对历史结果。'
  },
  {
    title: '按需刷新行情',
    description: '首次进入优先使用持久化快照；点击刷新行情后只更新当前页面的实时估值。'
  }
]

const tradeWorkflow: WorkflowStep[] = [
  {
    title: '录入成交',
    description: '搜索本地股票主数据，选择买入或卖出并填写日期、价格、数量和实际费用。'
  },
  {
    title: '核对结算',
    description: '表单实时预览成交金额、总费用和预计流入或流出，保存后由后端重新计算。'
  },
  {
    title: '筛选汇总',
    description: '按股票、方向和日期组合查询，核对买卖成交额、总费用和净资金流。'
  },
  {
    title: '持续维护',
    description: '成交信息有误时编辑，确认无效流水后删除；操作不会隐式改变持仓。'
  }
]

const tradeOperations: OperationGuide[] = [
  {
    area: '工具栏',
    name: '录入成交',
    prerequisite: '具备成交记录新增权限，股票已存在于本地主数据',
    operation: '点击“录入成交”，搜索股票并填写方向、日期时间、价格、数量、费用和备注。',
    effect: '保存独立成交流水；不会自动新增或调整“我的持仓”。',
    type: 'primary'
  },
  {
    area: '筛选区',
    name: '查询 / 重置',
    prerequisite: '无',
    operation: '按股票代码或名称、买卖方向和成交日期区间组合查询，重置可清空全部条件。',
    effect: '分页列表和全部筛选结果汇总使用完全相同的条件。',
    type: 'info'
  },
  {
    area: '汇总区',
    name: '资金汇总',
    prerequisite: '当前筛选范围存在成交记录',
    operation: '查看买入成交额、卖出成交额、总费用和净资金流。',
    effect: '净资金流按卖出结算流入减买入结算流出计算，不受当前页大小影响。',
    type: 'success'
  },
  {
    area: '表格行',
    name: '编辑 / 删除',
    prerequisite: '具备对应成交记录权限',
    operation: '点击编辑图标修正成交信息；删除需二次确认。',
    effect: '列表和汇总立即刷新，只影响当前用户的该条成交记录。',
    type: 'warning'
  }
]

const tradeFields: FieldGuide[] = [
  {
    field: '股票 / 方向 / 日期时间',
    meaning: '成交对应的本地股票、买入或卖出方向以及实际成交时间。',
    interaction: '成交日期不能晚于今天；时间可不填，买入红色、卖出绿色。'
  },
  {
    field: '成交价 / 数量 / 成交金额',
    meaning: '成交金额固定为成交价格乘成交数量。',
    interaction: '价格和金额显示 3 位小数，数量最多 4 位小数，均使用十进制定点计算。'
  },
  {
    field: '佣金 / 印花税 / 其他费用 / 总费用',
    meaning: '总费用为三项实际录入费用之和。',
    interaction: '费用不能为负数；页面不会代替券商自动推算费率。'
  },
  {
    field: '结算金额 / 资金流',
    meaning: '买入结算金额为成交金额加总费用，卖出为成交金额减总费用。',
    interaction: '买入显示负流出，卖出显示正流入；卖出费用大于成交金额时不能保存。'
  },
  {
    field: '备注 / 更新时间',
    meaning: '记录成交来源、计划或其他核对信息以及最后修改时间。',
    interaction: '备注最多 500 个字符；成交记录不会参与选股成功率统计。'
  }
]

const positionOperations: OperationGuide[] = [
  {
    area: '顶部命令',
    name: '导入 Excel',
    prerequisite: '文件前三个 Sheet 依次为持仓数据、已清仓数据、交易记录，并保留规定中文表头',
    operation: '选择文件并决定是否覆盖同代码当前持仓，提交后查看三个 Sheet 的结构化导入结果。',
    effect: '自动补股票主数据、个股池和持仓分组；重复导入不会重复生成同一成交记录。',
    type: 'primary'
  },
  {
    area: '资产指标区',
    name: '录入持仓',
    prerequisite: '股票已在当前用户跟踪列表，且尚未建立持仓',
    operation: '选择股票并填写持仓数量、平均成本、建仓日期和备注后保存。',
    effect: '为该股票建立唯一有效持仓；不会改变分组、跟踪日期或统计结果。',
    type: 'primary'
  },
  {
    area: '顶部命令',
    name: '刷新数据 / 刷新行情',
    prerequisite: '无',
    operation: '刷新数据重新读取数据库；刷新行情按当前个股池逐只获取最新报价并重算页面估值。',
    effect: '数据库刷新不会触发第三方请求；行情刷新只影响当前展示，不覆盖 Excel 历史快照。',
    type: 'info'
  },
  {
    area: '工具栏',
    name: '总资产设置',
    prerequisite: '具备持仓修改权限',
    operation: '点击总资产指标右上角的编辑图标，录入或修改当前用户总资产，金额最多保留 3 位小数。',
    effect: '可用资产按总资产减全部持仓市值只读计算，不需要手工维护。',
    type: 'primary'
  },
  {
    area: '当前持仓',
    name: '列预设 / 股票详情',
    prerequisite: '详情要求股票仍在当前用户个股池',
    operation: '切换持仓概览、收益周期或全部字段；点击股票名称打开详情。',
    effect: '可继续查看手工记录、K 线、行情、资讯、研报和基本面。',
    type: 'success'
  },
  {
    area: '表格行',
    name: '编辑 / 删除',
    prerequisite: '具备对应持仓权限',
    operation: '点击编辑或删除图标；编辑用于更新数量、成本、日期和备注，删除需要二次确认。',
    effect: '删除后不再计入持仓汇总，但不会删除股票主数据或跟踪记录。',
    type: 'warning'
  }
]

const positionFields: FieldGuide[] = [
  {
    field: '持有金额 / 仓位占比',
    meaning: 'Excel 快照中的当前持有金额和组合仓位；实时刷新后按最新价与总资产重新估值。',
    interaction: '总资产由用户维护，可用资产为总资产减全部可估值持仓金额。'
  },
  {
    field: '当日 / 持有 / 累计盈亏',
    meaning: '分别表达当天表现、当前持仓区间表现和 Excel 来源累计口径。',
    interaction: '金额显示 3 位小数，涨为红色、跌为绿色；空值不按零参与汇总。'
  },
  {
    field: '组合 / 周月年收益',
    meaning: '保留 Excel 中的组合盈亏、组合涨幅、本周、本月和今年盈亏。',
    interaction: '切换到“收益周期”可集中横向比较，不需要在概览中承受全部字段宽度。'
  },
  {
    field: '近1月 / 3月 / 6月 / 1年',
    meaning: '股票自身不同周期涨幅，用于判断当前持仓所处趋势阶段。',
    interaction: '这些字段来自导入快照，行情刷新不会臆造或覆盖周期收益。'
  },
  {
    field: '已清仓绩效',
    meaning: '展示清仓总盈亏、盈亏比、同期大盘、超额收益、买卖均价和持仓天数。',
    interaction: '顶部概览给出清仓胜率、累计已实现盈亏和平均跑赢大盘。'
  },
  {
    field: '交易流水',
    meaning: '复用成交记录表保存成交日期时间、类别、数量、价格、发生金额、成交金额和费用。',
    interaction: 'Excel 重复导入按稳定标识跳过；需要细调时仍可前往独立成交记录页面编辑。'
  }
]

const stockOperations: OperationGuide[] = [
  {
    area: '搜索区',
    name: '股票搜索',
    prerequisite: '输入代码、名称或拼音关键字',
    operation: '在搜索框输入关键字，等待远程候选；候选会标记本地股票池、真实行情、已入库或已跟踪。',
    effect: '只选择候选，不会立即写入；真实行情候选会在确认添加时由后端再次校验。',
    type: 'primary'
  },
  {
    area: '搜索区',
    name: '添加个股池',
    prerequisite: '已选择一只或多只未跟踪股票，并具备新增权限',
    operation: '点击“添加个股池”，核对目标分组和股票清单后确认；失败项可在结果弹窗中重试。',
    effect:
      '逐只写入或复用股票主数据并自动补全地域行业，单只失败不阻断其余股票；新增股票默认未设置跟踪日期。',
    type: 'primary'
  },
  {
    area: '批量区',
    name: '勾选股票',
    prerequisite: '列表中存在可操作股票',
    operation: '勾选表格左侧选择框，可同时选择多只股票。',
    effect:
      '勾选后显示选择上下文操作条，集中提供更新价格、设置或清空日期、同步地域行业和取消选择。',
    type: 'warning'
  },
  {
    area: '批量区',
    name: '批量更新价格',
    prerequisite: '至少勾选一只股票，并具备价格新增权限',
    operation: '选择日期区间并开始更新；系统按股票顺序获取行情，可确认覆盖已有手工记录。',
    effect: '逐股显示获取、新增、更新、量能回填、跳过和失败数量；单只失败不会阻断其余股票。',
    type: 'warning'
  },
  {
    area: '批量区',
    name: '批量设置日期',
    prerequisite: '至少勾选一只股票，并具备跟踪修改权限',
    operation: '选择“设置日期”填写统一起止日期，或选择“清空日期”移除全部选中股票的起止日期。',
    effect: '原子更新全部选中股票；清空后这些股票在重新设置日期前不参与成功率统计。',
    type: 'warning'
  },
  {
    area: '资料区',
    name: '标签管理 / 设置标签',
    prerequisite: '具备跟踪修改权限',
    operation:
      '点击顶部常驻“标签管理”维护标签库；在单股或批量“设置标签”中可搜索已有标签，也可直接输入新名称后提交。',
    effect:
      '新名称由后端在同一事务中创建并完成分配；移除模式只选择已有标签，失败不会留下半完成标签。',
    type: 'primary'
  },
  {
    area: '资料区',
    name: '同步地域行业',
    prerequisite: '具备股票主数据修改权限，外部资料源可用',
    operation:
      '有勾选时在选择操作条同步勾选股票；同步全部时从顶部“更多”菜单选择“同步全部地域行业”并确认。',
    effect:
      '按确认范围回写省份、城市和行业；取消确认不会发起请求，供应商空值不会覆盖数据库已有非空值。',
    type: 'success'
  },
  {
    area: '资料区',
    name: '刷新列表',
    prerequisite: '无',
    operation: '点击工具栏最右侧圆形刷新按钮。',
    effect: '重新加载分组、跟踪列表、行情、阶段涨幅和当前综合统计。',
    type: 'success'
  },
  {
    area: '筛选区',
    name: '省份 / 城市 / 行业',
    prerequisite: '股票主数据已同步对应字段',
    operation: '点击“筛选”展开高级条件，选择地域、行业、标签或跟踪日期。',
    effect: '仅在前端缩小当前列表范围；生效条件会在筛选按钮旁显示，可单独关闭。',
    type: 'info'
  },
  {
    area: '筛选区',
    name: '跟踪日期',
    prerequisite: '无',
    operation: '选择开始和结束查询日期，可与当前分组及地域行业条件组合使用。',
    effect: '显示跟踪区间与查询区间存在交集的股票；未填写结束跟踪日期的股票按持续跟踪处理。',
    type: 'info'
  },
  {
    area: '筛选区',
    name: '清空筛选',
    prerequisite: '至少存在一个地域行业或跟踪日期筛选条件',
    operation: '点击条件标签的关闭图标清除单项，或点击“清空全部”。',
    effect: '恢复显示当前分组下的全部股票。',
    type: 'info'
  },
  {
    area: '列表工具',
    name: '快捷范围',
    prerequisite: '当前分组存在股票',
    operation: '在个股列表工作条切换“全部、持续跟踪、未设日期、行情异常”。',
    effect: '快速定位需要继续观察、补跟踪日期或检查行情的数据，不修改数据库。',
    type: 'warning'
  },
  {
    area: '列表工具',
    name: '列设置 / 密度',
    prerequisite: '当前处于个股列表视图',
    operation: '选择紧凑或标准密度；在“列设置”中勾选字段，或应用核心字段、跟踪分析预设。',
    effect: '显示字段、列顺序和密度保存在当前浏览器；恢复默认会重新显示全部字段。',
    type: 'primary'
  },
  {
    area: '分组区',
    name: '分组选项卡',
    prerequisite: '当前用户至少有一个分组',
    operation: '点击分组名称切换；右侧图标可新建分组，并可重命名或删除当前普通分组。',
    effect: '固定“自选”始终排在首位且不能重命名或删除；同一股票可以同时属于多个分组。',
    type: 'success'
  },
  {
    area: '分组区',
    name: '同步技术数据',
    prerequisite: '当前分组存在股票，并具备价格新增权限',
    operation: '点击分组选项卡右侧“同步技术数据”，确认日期区间后按股票顺序同步。',
    effect:
      '默认同步约一年的 OHLCV 并回填缺失成交量；手工 OHLC 默认保留，均线、MACD 和 KDJ 在前端基于本地数据即时计算。',
    type: 'warning'
  },
  {
    area: '分组区',
    name: '资讯公告',
    prerequisite: '当前分组存在股票，外部资讯源可用',
    operation: '切换到“资讯公告”，选择资讯或公告，可按股票、标题、来源和摘要搜索并刷新。',
    effect: '最多三只股票并行加载并按发布时间倒序聚合；单只失败会独立标记，不影响其他股票结果。',
    type: 'info'
  },
  {
    area: '表格行',
    name: '分组',
    prerequisite: '具备跟踪修改权限',
    operation: '点击行内“分组”，勾选该股票所属的一个或多个分组并保存。',
    effect: '持久化多分组关系并刷新选项卡数量和当前列表。',
    type: 'primary'
  },
  {
    area: '表格行',
    name: '跟踪日期',
    prerequisite: '具备跟踪修改权限',
    operation: '点击行内“跟踪日期”，为单只股票设置日期或清空起止日期。',
    effect: '成功后刷新列表；未设置时开始和结束列显示“未设置”。',
    type: 'primary'
  },
  {
    area: '表格行',
    name: '详情',
    prerequisite: '具备跟踪查询权限',
    operation: '点击股票名称或行末查看图标。',
    effect: '打开股票详情抽屉，可维护手工记录并查看技术图、行情和外部资料。',
    type: 'primary'
  },
  {
    area: '表格行',
    name: '删除',
    prerequisite: '具备跟踪删除权限',
    operation: '点击行内“删除”，在确认框再次确认。',
    effect: '仅删除当前用户的跟踪关系；不会影响其他用户对同一股票的跟踪。',
    type: 'danger'
  }
]

const stockFields: FieldGuide[] = [
  {
    location: '当前综合统计',
    field: '综合成功率',
    meaning: '当前用户全部有效跟踪股票按最后累计涨跌结果计算的上涨股票占比。',
    interaction: '没有有效样本时显示 --；价格记录变化后刷新即可看到最新结果。'
  },
  {
    location: '当前综合统计',
    field: '有效 / 上涨 / 下跌 / 平盘股票',
    meaning: '按股票数统计，每只股票只贡献一个样本。',
    interaction: '分类使用该股票统计区间内最终累计结果，不按价格记录条数计数。'
  },
  {
    location: '跟踪列表',
    field: '股票名称 / 代码 / 市场',
    meaning: '股票主数据的名称、规范代码和所属交易所。',
    interaction: '可排序；代码由市场和证券代码组合展示。'
  },
  {
    location: '跟踪列表',
    field: '省份 / 城市 / 行业',
    meaning: '由股票资料同步写入的注册地域和行业信息。',
    interaction: '空值显示 --；可排序，也可通过页面顶部筛选。'
  },
  {
    location: '跟踪列表',
    field: '开始 / 结束跟踪日期',
    meaning: '股票进入和退出当前跟踪区间的日期；开始日期为空表示尚未开始跟踪。',
    interaction: '未设置显示“未设置”，有开始但无结束显示“持续跟踪”；可排序、拖动和范围查询。'
  },
  {
    location: '跟踪列表',
    field: '开盘 / 最新 / 最高 / 最低',
    meaning: '外部行情返回的当日价格，统一显示两位小数。',
    interaction: '行情不可用时显示 --，不会用 0 代替；可按实际数值排序。'
  },
  {
    location: '跟踪列表',
    field: '当日涨跌幅',
    meaning: '外部行情最新价或收盘价相对前收盘价的涨跌幅。',
    interaction: '正值、负值使用不同颜色；外部行情状态不影响本地手工记录。'
  },
  {
    location: '跟踪列表',
    field: '跟踪 5 日 / 10 日涨幅',
    meaning:
      '从跟踪日期当天开始，分别累加前 5 条或前 10 条已保存的非空当日涨幅，跟踪日涨幅作为第一笔。',
    interaction: '不足 5 或 10 条时按现有非空涨幅累加；未设置跟踪日期或没有有效当日涨幅时显示 --。'
  },
  {
    location: '跟踪列表',
    field: '跟踪累计涨幅',
    meaning: '对包含跟踪日期当天在内的跟踪闭区间中所有非空当日涨幅进行算术累加。',
    interaction: '使用本地持久化数据，不会额外请求第三方；支持排序和拖动列顺序。'
  },
  {
    location: '跟踪列表',
    field: '行情状态 / 行情时间',
    meaning: '标识外部行情成功、缓存、不可用等状态以及供应商数据时间。',
    interaction: '用于判断数据新鲜度；状态和时间都支持排序。'
  },
  {
    location: '表头',
    field: '排序 / 拖动 / 列设置',
    meaning: '点击表头切换升降序；拖动表头左侧图标调整位置；列设置控制字段显隐。',
    interaction: '空值始终排在有效值后；列顺序、显示字段和表格密度保存在当前浏览器中。'
  }
]

const stockDetailCapabilities: CapabilityGuide[] = [
  {
    area: '手工记录',
    content:
      '明显展示未开始、持续或已结束跟踪状态，以及交易日期、OHLC、成交量、持久化当日涨幅、来源和更新时间。',
    actions:
      '保存或清空跟踪日期、导入历史行情、新增记录、编辑、删除和刷新。导入预览可核对成交量并确认是否覆盖手工记录。',
    note: '价格、成交量和当日涨幅存储在数据库中；修改价格或跟踪日期后建议重建历史统计。',
    type: 'primary'
  },
  {
    area: 'K 线',
    content:
      '使用本地已保存 OHLCV 绘制日线、周线或月线，联动展示成交量、可选 MA5/10/15/20/30/60/250、MACD(12,26,9) 和 KDJ(9,3)。',
    actions:
      '选择日期区间和 K 线周期，勾选均线，使用缩放和十字指示器核对节点；红色向上“金”和绿色向下“死”分别标记金叉、死叉。',
    note: '周月线、均线和交叉信号只基于本地日线计算，不会再次请求第三方或写回数据库。',
    type: 'warning'
  },
  {
    area: '行情',
    content: '最新价、涨跌额、涨跌幅、开高低、前收、交易状态和数据时间。',
    actions: '切换到标签时加载外部行情。',
    note: '显示供应商、成功/缓存/不可用状态；外部失败不影响手工记录。',
    type: 'success'
  },
  {
    area: '资讯公告',
    content:
      '详情内展示单股新闻公告；股票页分组视图聚合当前分组的股票、发布时间、来源、类型、标题和摘要。',
    actions: '切换新闻/公告分类、按关键字筛选、刷新列表，点击链接图标安全打开原文。',
    note: '分组聚合最多三路并发，单股失败不清空其他结果；成功无数据与供应商不可用会分别展示。',
    type: 'info'
  },
  {
    area: '研报',
    content: '报告日期、机构、评级、作者和标题。',
    actions: '查看分页结果，点击标题打开研报原文。',
    note: '数据来自外部供应商，仅作为研究辅助。',
    type: 'info'
  },
  {
    area: '基本面',
    content: '估值概览、业绩双柱与同比环比折线、股东人数折线、明细表和十大股东。',
    actions: '在概览、业绩详情、股东人数、十大股东次级标签间切换，并用 tooltip 核对图表节点。',
    note: '缺失值保持 --，不会按 0 处理；表格保留用于精确核对。',
    type: 'success'
  }
]

const statisticsDefinitions: StatisticsDefinition[] = [
  {
    name: '每日成功率',
    sample: '快照日仍在跟踪区间内，并且当日存在非空持久化涨幅的股票；每只股票一个样本。',
    calculation: '直接使用快照日的当日涨幅，大于 0 为上涨，等于 0 为平盘，小于 0 为下跌。',
    detail: '节点明细展示当日涨跌幅和当日分类。',
    type: 'primary'
  },
  {
    name: '累计成功率',
    sample: '快照日仍在跟踪区间内，且从开始跟踪日至快照日存在至少一个非空当日涨幅的股票。',
    calculation: '逐日累加每只股票从开始跟踪日至快照日的持久化当日涨幅，再按累计值正、零、负分类。',
    detail: '节点明细展示累计涨跌幅（逐日求和）和累计分类。',
    type: 'success'
  },
  {
    name: '能力分析历史样本',
    sample:
      '截至分析日已经开始跟踪且至少存在一个非空持久化涨幅的股票；已结束股票按结束日封顶后继续保留。',
    calculation:
      'D0 只认跟踪日当天涨幅；Dn 要求从 D0 起具备 n+1 条有效交易日涨幅。缺失值不补零，后续记录不会顶替 D0。',
    detail: '批次、归因、分布、极值、质量和分组节点统一打开可搜索、筛选和排序的逐股事实。',
    type: 'info'
  }
]

const statisticsOperations: OperationGuide[] = [
  {
    area: '筛选区',
    name: '日期范围',
    prerequisite: '可留空',
    operation: '可直接选择近 7 日、近 30 日或全部，也可选择自定义开始和结束日期后点击“查询”。',
    effect: '趋势图和每日明细只展示所选闭区间内的快照。',
    type: 'primary'
  },
  {
    area: '筛选区',
    name: '重置',
    prerequisite: '已选择日期范围',
    operation: '点击日期区域右侧的重置图标。',
    effect: '清空日期条件并重新加载全部可用快照。',
    type: 'info'
  },
  {
    area: '筛选区',
    name: '重建历史',
    prerequisite: '具备统计查询权限',
    operation: '点击“重建历史”并确认。',
    effect: '从当前用户最早跟踪日期到今天幂等重算快照，自动跳过并清理非交易日快照。',
    type: 'warning'
  },
  {
    area: '指标区',
    name: '多时间尺度摘要',
    prerequisite: '当前筛选范围内存在快照',
    operation: '对照当日、近 5 日加权、近 20 日加权、累计成功率和短期相对长期百分点差。',
    effect: '5/20 日按窗口总上涨股票数除以总有效股票数加权，不会直接平均每天的百分比。',
    type: 'success'
  },
  {
    area: '能力分析',
    name: '变化归因',
    prerequisite: '当前分析日存在前序有效快照或前序本地价格日期',
    operation: '查看前次与当前累计成功率及百分点差，点击新增、转涨、转跌、退出或缺失、保持不变。',
    effect: '五类归因互斥，分类数量和逐股当前、前次累计结果可以直接核对。',
    type: 'primary'
  },
  {
    area: '能力分析',
    name: 'D0 / D1 / D3 / D5 / D10',
    prerequisite: '股票已设置开始跟踪日期并具有相应完整交易日涨幅',
    operation: '在跟踪批次矩阵中点击成功率和样本数组合，或点击批次股票数与平均累计涨幅。',
    effect: '固定持有周期与最终累计结果分开显示，D0 缺失的股票不会进入任一 Dn 单元格。',
    type: 'success'
  },
  {
    area: '能力分析',
    name: '收益分布与可靠性',
    prerequisite: '截至分析日存在累计有效样本',
    operation: '点击四档收益柱、最大上涨、最大下跌或任一样本质量数字。',
    effect: '展示平均、中位数、极值、样本缺口以及低/中/高可靠性和 95% Wilson 区间。',
    type: 'warning'
  },
  {
    area: '能力分析',
    name: '分组能力对比',
    prerequisite: '当前用户存在股票分组',
    operation: '按任意字段排序比较当日、跟踪 5 日、累计成功率和平均累计涨幅，点击查看分组明细。',
    effect: '同一股票属于多个分组时分别计入，便于比较不同选股来源或方法。',
    type: 'info'
  },
  {
    area: '能力分析',
    name: '市场基准',
    prerequisite: '历史行情供应商可用且本地存在累计有效样本',
    operation: '切换沪深 300、上证指数或深证成指，查看股票池、基准、平均超额和跑赢比例。',
    effect:
      '每只股票按自己的跟踪起止闭区间比较；外部失败或区间不完整只影响基准区，不清空本地能力分析。',
    type: 'info'
  },
  {
    area: '短期趋势',
    name: '每日 / 5 日 / 20 日',
    prerequisite: '当前范围内存在快照',
    operation: '每日线观察即时变化，5 日和 20 日加权线观察短期表现是否稳定。',
    effect: '点击每日节点打开逐股明细；点击滚动节点打开组成窗口的逐日样本与胜负汇总。',
    type: 'primary'
  },
  {
    area: '长期趋势',
    name: '累计表现与样本',
    prerequisite: '节点存在累计有效股票',
    operation: '结合累计成功率折线和累计有效股票柱观察长期表现与样本规模。',
    effect: '点击折线或样本柱均打开该交易日的累计逐股明细。',
    type: 'success'
  },
  {
    area: '结果构成',
    name: '上涨 / 下跌 / 平盘',
    prerequisite: '节点存在每日有效股票',
    operation: '查看每日堆叠柱中上涨、下跌和平盘股票数量。',
    effect: '用于解释成功率变化是否来自胜负结构或样本变化；点击柱体打开当日逐股明细。',
    type: 'primary'
  },
  {
    area: '每日明细',
    name: '批量重建',
    prerequisite: '已勾选一个或多个快照日期，并具备统计查询权限',
    operation: '勾选每日明细左侧选择框，在出现的选择操作条中点击“批量重建”并确认。',
    effect: '只重算选中日期，重复日期自动去重、非交易日跳过，完成后清空选择并刷新页面。',
    type: 'warning'
  },
  {
    area: '每日明细',
    name: '当日 / 累计',
    prerequisite: '该日期存在快照',
    operation: '点击行内日历图标查看每日口径，或点击趋势图标查看累计口径。',
    effect: '打开指定口径的逐股明细，效果与点击对应趋势节点一致。',
    type: 'primary'
  },
  {
    area: '每日明细',
    name: '重建',
    prerequisite: '具备统计查询权限，且目标是非未来交易日',
    operation: '点击行内刷新图标。',
    effect: '只重算当前用户指定交易日的快照；非交易日会明确拒绝，不影响其他日期或其他用户。',
    type: 'warning'
  },
  {
    area: '逐股明细',
    name: '重建当前日期',
    prerequisite: '已打开某日逐股明细',
    operation: '点击弹窗底部重建按钮。',
    effect: '重算该日后刷新趋势、每日明细和当前弹窗内容。',
    type: 'warning'
  }
]

const statisticsFields: FieldGuide[] = [
  {
    field: '能力分析截止日',
    meaning: '当前日期筛选范围内最新可见快照日，作为批次、分布、分组和市场基准的统一分析截止日。',
    interaction: '修改日期筛选后自动切换；全量、单日或批量重建完成后，即使截止日不变也会刷新。'
  },
  {
    field: '样本可靠性 / Wilson 区间',
    meaning:
      '累计有效样本少于 5 为低、5 至 19 为中、20 及以上为高；区间反映样本规模下成功率的不确定性。',
    interaction: '空样本显示暂无有效样本且区间为 --，不会显示 0% 或高可靠性。'
  },
  {
    field: '快照日期',
    meaning: '统计数据对应的交易日，非交易日不生成快照。',
    interaction: '表格可点击表头排序；趋势图横轴同时显示日期和周几。'
  },
  {
    field: '每日成功率 / 每日样本',
    meaning: '当日上涨股票数占当日有效股票数的比例，以及参与该口径的股票数。',
    interaction: '无有效样本时成功率显示 --，不会伪装成 0.00%。'
  },
  {
    field: '每日上涨 / 下跌 / 平盘',
    meaning: '按照快照日持久化当日涨幅分类的股票数量。',
    interaction: '三类数量之和应等于每日样本。'
  },
  {
    field: '累计成功率 / 累计样本',
    meaning: '累计上涨股票数占累计有效股票数的比例，以及参与累计口径的股票数。',
    interaction: '累计口径按每只股票从开始跟踪日起逐日求和判断。'
  },
  {
    field: '累计上涨 / 下跌 / 平盘',
    meaning: '按照每只股票累计涨幅正、负、零分类的数量。',
    interaction: '三类数量之和应等于累计样本。'
  },
  {
    field: '跟踪统计区间',
    meaning: '该快照实际有效样本覆盖的最早跟踪日期到快照日期。',
    interaction: '用于核对跟踪日期变更和历史重建是否生效。'
  },
  {
    field: '操作',
    meaning: '提供多选批量重建、当日明细、累计明细和单日重建入口。',
    interaction: '选择列和操作列固定，不参与排序；批量重建不会修改未选日期。'
  }
]

const snapshotDetailFields: FieldGuide[] = [
  {
    field: '能力分析统一明细',
    meaning:
      '展示股票与分组、跟踪区间、当日涨幅、跟踪 5/10 日、当前与前次累计涨幅、有效交易日和累计结果。',
    interaction: '支持股票/代码/分组搜索、结果和跟踪状态筛选，所有展示字段可排序且空值始终置后。'
  },
  {
    field: '5 / 20 日滚动明细',
    meaning: '展示所点滚动节点实际包含的交易日、每日样本、上涨、下跌、平盘和每日成功率。',
    interaction: '窗口顶部显示加权成功率与股票日样本，点击任一有效交易日继续查看当日逐股明细。'
  },
  {
    field: '概览',
    meaning: '展示当前明细中的上涨数、下跌数和所有非空涨跌幅的算术平均值。',
    interaction: '切换 DAILY / CUMULATIVE 口径时同步变化；空涨幅不参与平均值。'
  },
  {
    field: '股票名称 / 代码 / 市场',
    meaning: '当前快照参与计算的股票身份信息。',
    interaction: '可按每列升降序排序。'
  },
  {
    field: '开始 / 结束跟踪日期',
    meaning: '快照计算时使用的跟踪区间边界，结束日期为空表示仍在跟踪。',
    interaction: '用于确认该股票在快照日是否应纳入统计。'
  },
  {
    field: '首日 / 末日交易日期',
    meaning: '当前统计类型实际取到的价格或涨幅区间边界。',
    interaction: '可与手工记录中的交易日期核对。'
  },
  {
    field: '首日 / 末日收盘价',
    meaning: '用于辅助核对区间数据的首尾收盘价，统一显示两位小数。',
    interaction: '缺失值显示 --，排序时始终置后。'
  },
  {
    field: '当日或累计涨跌幅',
    meaning: 'DAILY 展示快照日当日涨幅；CUMULATIVE 展示从开始跟踪日起逐日涨幅之和。',
    interaction: '弹窗标题和列名会明确当前口径。'
  },
  {
    field: '结果',
    meaning: '按照当前口径涨跌幅的正、负、零显示上涨、下跌或平盘。',
    interaction: '应与概览数量及该日快照汇总一致。'
  }
]
</script>

<style scoped lang="scss">
.guide-header {
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  gap: 24px;
  margin-bottom: 18px;
}

.guide-header__content {
  min-width: 0;
}

.guide-header__eyebrow {
  margin-bottom: 6px;
  font-size: 13px;
  font-weight: 600;
  color: var(--el-color-primary);
}

.guide-header__title {
  margin: 0;
  font-size: 24px;
  line-height: 1.35;
  color: var(--el-text-color-primary);
}

.guide-header__description {
  max-width: 760px;
  margin: 10px 0 0;
  font-size: 14px;
  line-height: 1.7;
  color: var(--el-text-color-secondary);
}

.guide-actions {
  display: flex;
  flex: 0 0 auto;
  flex-wrap: wrap;
  justify-content: flex-end;
  gap: 10px;
}

.guide-tabs :deep(.el-tabs__header) {
  margin-bottom: 22px;
}

.guide-section {
  padding: 0 0 28px;
  margin-bottom: 28px;
  border-bottom: 1px solid var(--el-border-color-lighter);
}

.guide-section--last {
  padding-bottom: 0;
  margin-bottom: 0;
  border-bottom: 0;
}

.section-heading {
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  gap: 16px;
  margin-bottom: 16px;
}

.section-heading__title {
  margin: 0;
  font-size: 18px;
  line-height: 1.4;
  color: var(--el-text-color-primary);
}

.section-heading__description {
  margin: 6px 0 0;
  font-size: 14px;
  line-height: 1.6;
  color: var(--el-text-color-secondary);
}

.workflow-grid {
  display: grid;
  grid-template-columns: repeat(5, minmax(0, 1fr));
  border-top: 1px solid var(--el-border-color-lighter);
  border-bottom: 1px solid var(--el-border-color-lighter);
}

.workflow-step {
  display: flex;
  gap: 12px;
  min-width: 0;
  padding: 18px 16px;
  border-right: 1px solid var(--el-border-color-lighter);
}

.workflow-step:last-child {
  border-right: 0;
}

.workflow-step__index {
  display: inline-flex;
  width: 28px;
  height: 28px;
  font-size: 13px;
  font-weight: 700;
  color: var(--el-color-primary);
  background: var(--el-color-primary-light-9);
  border: 1px solid var(--el-color-primary-light-5);
  border-radius: 50%;
  flex: 0 0 28px;
  align-items: center;
  justify-content: center;
}

.workflow-step__title {
  font-size: 14px;
  font-weight: 600;
  line-height: 1.5;
  color: var(--el-text-color-primary);
}

.workflow-step__description {
  margin-top: 6px;
  font-size: 13px;
  line-height: 1.6;
  color: var(--el-text-color-secondary);
}

.guide-table-wrap {
  width: 100%;
  overflow-x: auto;
}

.guide-table-wrap :deep(.el-table) {
  min-width: 920px;
}

.guide-table-wrap :deep(.el-table__cell) {
  vertical-align: top;
}

.guide-table-wrap :deep(.cell) {
  line-height: 1.6;
  overflow-wrap: anywhere;
  white-space: normal;
}

@media (width <= 1100px) {
  .workflow-grid {
    grid-template-columns: repeat(2, minmax(0, 1fr));
  }

  .workflow-step:nth-child(2n) {
    border-right: 0;
  }

  .workflow-step:last-child {
    border-top: 1px solid var(--el-border-color-lighter);
  }
}

@media (width <= 720px) {
  .guide-header {
    flex-direction: column;
  }

  .guide-actions {
    width: 100%;
    justify-content: flex-start;
  }

  .guide-actions :deep(.el-button) {
    margin-left: 0;
  }

  .workflow-grid {
    grid-template-columns: minmax(0, 1fr);
  }

  .workflow-step,
  .workflow-step:nth-child(2n),
  .workflow-step:last-child {
    border-top: 0;
    border-right: 0;
    border-bottom: 1px solid var(--el-border-color-lighter);
  }

  .workflow-step:last-child {
    border-bottom: 0;
  }

  .guide-header__title {
    font-size: 21px;
  }
}
</style>
