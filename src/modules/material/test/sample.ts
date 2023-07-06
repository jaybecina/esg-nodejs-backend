import { MaterialPostDto } from "../interfaces/dto";
import { inputType, qnaType } from "../interfaces/materialForm";

export const sampleTextMaterial: MaterialPostDto = {
  "name": "Gas consumption 1",
  "uniqueId": "gas-consumption-1",
  "size": 4,
  "type": qnaType.text,
  "content": [
    {
      "question": "question 1",
      "hints": "hint 1"
    },
    {
      "question": "question 2",
      "hints": "hint 1"
    }
  ]
};

export const sampleMatrixMaterial = {
  "name": "Gas consumption 2",
  "uniqueId": "gas-consumption-2",
  "size": 4,
  "type": qnaType.matrix,
  "content": [
    {
      "rows": [
        { "name": "shop 1" },
        { "name": "shop 2" }
      ],
      "columns": [
        {
          "name": "First 6 Months",
          "inputType": inputType.number,
          "outputUnit": "L"
        },
        {
          "name": "Last 6 Months",
          "inputType": inputType.number,
          "outputUnit": "mL"
        },
        {
          "name": "Code",
          "inputType": inputType.text,
          "outputUnit": "N/A"
        }
      ]
    }]
};

export const sampleTextOnlyMatrixMaterial = {
  "name": "Text Only Matrix",
  "uniqueId": "text-only-matrix",
  "size": 4,
  "type": qnaType.matrix,
  "content": [
    {
      "rows": [
        { "name": "shop 1" },
        { "name": "shop 2" }
      ],
      "columns": [
        {
          "name": "Name",
          "inputType": inputType.text,
          "outputUnit": "N/A"
        },
        {
          "name": "Code",
          "inputType": inputType.text,
          "outputUnit": "N/A"
        }
      ]
    }]
};

export const sampleMaterials = [sampleTextMaterial, sampleMatrixMaterial];