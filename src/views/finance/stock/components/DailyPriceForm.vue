<template>
  <Dialog v-model="dialogVisible" :title="dialogTitle" width="560px">
    <el-form
      ref="formRef"
      v-loading="formLoading"
      :model="formData"
      :rules="formRules"
      label-width="92px"
    >
      <el-form-item label="交易日期" prop="tradeDate">
        <el-date-picker
          v-model="formData.tradeDate"
          type="date"
          value-format="YYYY-MM-DD"
          placeholder="请选择交易日期"
          :disabled-date="disableFutureDate"
          class="!w-full"
        />
      </el-form-item>
      <div class="price-grid">
        <el-form-item label="开盘价" prop="openPrice">
          <el-input-number
            v-model="formData.openPrice"
            :min="0.01"
            :precision="2"
            :step="0.01"
            :controls="true"
            class="!w-full"
          />
        </el-form-item>
        <el-form-item label="收盘价" prop="closePrice">
          <el-input-number
            v-model="formData.closePrice"
            :min="0.01"
            :precision="2"
            :step="0.01"
            :controls="true"
            class="!w-full"
          />
        </el-form-item>
        <el-form-item label="最高价" prop="highPrice">
          <el-input-number
            v-model="formData.highPrice"
            :min="0.01"
            :precision="2"
            :step="0.01"
            :controls="true"
            class="!w-full"
          />
        </el-form-item>
        <el-form-item label="最低价" prop="lowPrice">
          <el-input-number
            v-model="formData.lowPrice"
            :min="0.01"
            :precision="2"
            :step="0.01"
            :controls="true"
            class="!w-full"
          />
        </el-form-item>
        <el-form-item label="成交量（手）" prop="volume" class="volume-field">
          <el-input-number
            v-model="formData.volume"
            :min="0"
            :precision="2"
            :step="100"
            :controls="false"
            placeholder="可选，留空表示暂无量能数据"
            class="!w-full"
          />
        </el-form-item>
      </div>
      <el-alert
        type="info"
        :closable="false"
        show-icon
        title="最高价应不低于开盘价、收盘价和最低价；最低价应不高于其他三项价格。"
      />
    </el-form>
    <template #footer>
      <el-button type="primary" :disabled="formLoading" @click="submitForm">
        <Icon icon="ep:check" class="mr-5px" />
        保存
      </el-button>
      <el-button @click="dialogVisible = false">取消</el-button>
    </template>
  </Dialog>
</template>

<script setup lang="ts">
import type { FormInstance, FormRules } from 'element-plus'
import {
  StockApi,
  StockDailyPriceCreateVO,
  StockDailyPriceUpdateVO,
  StockDailyPriceVO
} from '@/api/finance/stock'

defineOptions({ name: 'FinanceStockDailyPriceForm' })

type FormType = 'create' | 'update'

interface DailyPriceFormData {
  id?: number
  trackId?: number
  tradeDate: string
  openPrice?: number
  closePrice?: number
  highPrice?: number
  lowPrice?: number
  volume?: number
}

const message = useMessage()
const dialogVisible = ref(false)
const dialogTitle = ref('')
const formLoading = ref(false)
const formType = ref<FormType>('create')
const formRef = ref<FormInstance>()
const formData = ref<DailyPriceFormData>(createEmptyForm())

const formRules: FormRules<DailyPriceFormData> = {
  tradeDate: [{ required: true, message: '请选择交易日期', trigger: 'change' }],
  openPrice: [{ required: true, message: '请输入开盘价', trigger: 'blur' }],
  closePrice: [{ required: true, message: '请输入收盘价', trigger: 'blur' }],
  highPrice: [{ required: true, message: '请输入最高价', trigger: 'blur' }],
  lowPrice: [{ required: true, message: '请输入最低价', trigger: 'blur' }]
}

const emit = defineEmits<{
  success: []
}>()

function createEmptyForm(): DailyPriceFormData {
  return {
    tradeDate: '',
    openPrice: undefined,
    closePrice: undefined,
    highPrice: undefined,
    lowPrice: undefined,
    volume: undefined
  }
}

const open = (type: FormType, trackId: number, record?: StockDailyPriceVO) => {
  formType.value = type
  dialogTitle.value = type === 'create' ? '新增每日价格' : '编辑每日价格'
  formData.value =
    type === 'update' && record
      ? {
          id: record.id,
          trackId: record.trackId,
          tradeDate: record.tradeDate,
          openPrice: record.openPrice,
          closePrice: record.closePrice,
          highPrice: record.highPrice,
          lowPrice: record.lowPrice,
          volume: record.volume ?? undefined
        }
      : { ...createEmptyForm(), trackId }
  dialogVisible.value = true
  nextTick(() => formRef.value?.clearValidate())
}

const validateOhlc = (): string | null => {
  const { openPrice, closePrice, highPrice, lowPrice } = formData.value
  if (
    openPrice === undefined ||
    closePrice === undefined ||
    highPrice === undefined ||
    lowPrice === undefined
  ) {
    return '请完整填写开盘、收盘、最高和最低价格'
  }
  if ([openPrice, closePrice, highPrice, lowPrice].some((value) => value <= 0)) {
    return '所有价格必须大于 0'
  }
  if (highPrice < Math.max(openPrice, closePrice, lowPrice)) {
    return '最高价不能低于开盘价、收盘价或最低价'
  }
  if (lowPrice > Math.min(openPrice, closePrice, highPrice)) {
    return '最低价不能高于开盘价、收盘价或最高价'
  }
  return null
}

const submitForm = async () => {
  const valid = await formRef.value?.validate()
  if (!valid) return
  const ohlcError = validateOhlc()
  if (ohlcError) {
    message.error(ohlcError)
    return
  }
  const { id, trackId, tradeDate, openPrice, closePrice, highPrice, lowPrice, volume } =
    formData.value
  if (
    !tradeDate ||
    openPrice === undefined ||
    closePrice === undefined ||
    highPrice === undefined ||
    lowPrice === undefined
  ) {
    return
  }

  formLoading.value = true
  try {
    if (formType.value === 'create' && trackId !== undefined) {
      const data: StockDailyPriceCreateVO = {
        trackId,
        tradeDate,
        openPrice,
        closePrice,
        highPrice,
        lowPrice,
        volume: volume ?? null
      }
      await StockApi.createDailyPrice(data)
      message.success('每日价格已新增')
    } else if (formType.value === 'update' && id !== undefined) {
      const data: StockDailyPriceUpdateVO = {
        id,
        tradeDate,
        openPrice,
        closePrice,
        highPrice,
        lowPrice,
        volume: volume ?? null
      }
      await StockApi.updateDailyPrice(data)
      message.success('每日价格已更新')
    }
    dialogVisible.value = false
    emit('success')
  } finally {
    formLoading.value = false
  }
}

const disableFutureDate = (date: Date) => date.getTime() > Date.now()

defineExpose({ open })
</script>

<style scoped>
.price-grid {
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  column-gap: 16px;
}

.volume-field {
  grid-column: 1 / -1;
}

@media (width <= 640px) {
  .price-grid {
    grid-template-columns: minmax(0, 1fr);
  }
}
</style>
