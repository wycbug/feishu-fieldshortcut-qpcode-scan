import {
  basekit,
  FieldType,
  field,
  FieldComponent,
  FieldCode,
  FieldContext,
} from "@lark-opdev/block-basekit-server-api";
import jsQR from "jsqr";
import { createCanvas, loadImage } from "canvas";
const { t } = field;

// 标准化日志上下文信息，便于检索
function formatContext(ctx: FieldContext): string {
  const c: any = ctx as any;
  return [
    `logID=${c?.logID ?? ""}`,
    `packID=${c?.packID ?? ""}`,
    `tenantKey=${c?.tenantKey ?? ""}`,
    `baseID=${c?.baseID ?? ""}`,
    `tableID=${c?.tableID ?? ""}`,
    `baseOwnerID=${c?.baseOwnerID ?? ""}`,
    `timeZone=${c?.timeZone ?? ""}`,
    `isNeedPayPack=${c?.isNeedPayPack ?? ""}`,
    `hasQuota=${c?.hasQuota ?? ""}`,
    `baseSignature=${c?.baseSignature ?? ""}`,
  ]
    .map((kv) => `[${kv}]`)
    .join(" ");
}

basekit.addField({
  // 定义捷径的i18n语言资源
  i18n: {
    messages: {
      "zh-CN": {
        inputText: "附件字段",
        errorProcessing: "处理失败，请重试",
        parseSuccess: "二维码扫描成功",
        parseFailed: "二维码扫描失败",
        noQRData: "未找到二维码",
        downloadError: "下载附件失败",
        noFieldsSelected: "请至少选择一个附件字段",
      },
      "en-US": {
        inputText: "Attachment Field",
        errorProcessing: "Processing failed, please try again",
        parseSuccess: "QR code scan successful",
        parseFailed: "QR code scan failed",
        noQRData: "No QR code found",
        downloadError: "Failed to download attachment",
        noFieldsSelected: "Please select at least one attachment field",
      },
      "ja-JP": {
        inputText: "添付フィールド",
        errorProcessing: "処理に失敗しました。もう一度お試しください",
        parseSuccess: "QRコードスキャン成功",
        parseFailed: "QRコードスキャン失敗",
        noQRData: "QRコードが見つかりません",
        downloadError: "添付ファイルのダウンロードに失敗しました",
        noFieldsSelected: "少なくとも1つの添付フィールドを選択してください",
      },
    },
  },

  // 定义捷径的入参
  formItems: [
    {
      key: "file",
      label: t("inputText"),
      component: FieldComponent.FieldSelect,
      props: {
        supportType: [FieldType.Attachment],
        mode: "single",
      },
      validator: {
        required: false,
      },
    },
  ],

  // 定义捷径的返回结果类型
  resultType: {
    type: FieldType.Text,
  },

  // 捷径处理函数
  execute: async function (
    formItemParams: {
      file: any[];
    },
    context: FieldContext
  ) {
    try {
      console.log(`${formatContext(context)} 开始执行二维码扫描功能`);

      // 检查必要参数
      if (!formItemParams.file || formItemParams.file.length === 0) {
        return {
          code: FieldCode.Success,
          msg: t("errorProcessing"),
          data: t("noFieldsSelected"),
        };
      }
      console.log(
        `${formatContext(context)} 用户填入文件信息:`,
        formItemParams.file
      );

      // 处理单选附件字段（仍然是数组格式，取第一个）
      const attachmentArray = Array.isArray(formItemParams.file) ? formItemParams.file : [formItemParams.file];
      const attachment = attachmentArray[0];
      if (!attachment) {
        return {
          code: FieldCode.Success,
          data: t("noFieldsSelected"),
          msg: t("noFieldsSelected"),
        };
      }
      
      const url = attachment?.tmp_url || attachment?.url || attachment?.link;
      const filename = attachment?.name || "unknown";
      
      if (!url) {
        return {
          code: FieldCode.Success,
          data: t("downloadError"),
          msg: t("downloadError"),
        };
      }

      try {
        console.log(`${formatContext(context)} 开始处理文件: ${filename}`);
        
        // 下载图片文件
        const response = await fetch(url);
        if (!response.ok) {
          return {
            code: FieldCode.Success,
            data: `${t("downloadError")} (${response.status})`,
            msg: `${t("downloadError")} (${response.status})`,
          };
        }

        const buffer = await response.arrayBuffer();
        
        // 使用Node.js canvas处理图像
        const img = await loadImage(Buffer.from(buffer));
        const canvas = createCanvas(img.width, img.height);
        const ctx = canvas.getContext('2d');
        ctx.drawImage(img, 0, 0);
        
        const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
        
        // 使用jsQR扫描二维码
        const code = jsQR(imageData.data, imageData.width, imageData.height);
        
        if (code) {
          console.log(`${formatContext(context)} 二维码扫描成功: ${code.data}`);
          return {
            code: FieldCode.Success,
            data: code.data,
            msg: t("parseSuccess"),
          };
        } else {
          return {
            code: FieldCode.Success,
            data: t("noQRData"),
            msg: t("noQRData"),
          };
        }
        
      } catch (fileError) {
        console.error(`${formatContext(context)} 处理文件 ${filename} 时出错:`, fileError);
        const errMsg = fileError instanceof Error ? fileError.message : "未知错误";
        return {
          code: FieldCode.Success,
          data: `${t("parseFailed")} - ${errMsg}`,
          msg: `${t("parseFailed")} - ${errMsg}`,
        };
      }
    } catch (error) {
      console.error(`${formatContext(context)} 执行出错`, error);
      const errMsg = error instanceof Error ? error.message : "未知错误";
      return {
        code: FieldCode.Success,
        data: `${t("parseFailed")}：${errMsg}`,
        msg: `${t("parseFailed")}：${errMsg}`,
      };
    }
  },
});

export default basekit;
