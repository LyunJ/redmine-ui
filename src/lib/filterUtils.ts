import type { RedmineIssue } from "../types/redmine";
import type { FilterCondition } from "../types/app";

/**
 * RedmineIssue에서 필터 필드 값을 추출한다.
 * RedmineNamedId 필드는 id를 문자열로 반환.
 * 날짜 필드는 YYYY-MM-DD 형식으로 잘라서 반환.
 */
function getFieldValue(issue: RedmineIssue, field: FilterCondition["field"]): string {
  switch (field) {
    case "status":
      return String(issue.status.id);
    case "priority":
      return String(issue.priority.id);
    case "tracker":
      return String(issue.tracker.id);
    case "project":
      return String(issue.project.id);
    case "assigned_to":
      return issue.assigned_to ? String(issue.assigned_to.id) : "";
    case "start_date":
      return issue.start_date?.slice(0, 10) ?? "";
    case "due_date":
      return issue.due_date?.slice(0, 10) ?? "";
    case "created_on":
      return issue.created_on.slice(0, 10);
    case "updated_on":
      return issue.updated_on.slice(0, 10);
    case "done_ratio":
      return String(issue.done_ratio);
    default: {
      // cf_${number} 커스텀 필드
      const cfId = Number(field.slice(3));
      const cf = issue.custom_fields?.find((c) => c.id === cfId);
      if (!cf || cf.value === null) return "";
      return Array.isArray(cf.value) ? cf.value.join(",") : cf.value;
    }
  }
}

function isNumericField(field: FilterCondition["field"]): boolean {
  return field === "done_ratio";
}

function isDateField(field: FilterCondition["field"]): boolean {
  return ["start_date", "due_date", "created_on", "updated_on"].includes(field);
}

function matchCondition(fieldValue: string, operator: FilterCondition["operator"], conditionValue: string, field: FilterCondition["field"]): boolean {
  if (fieldValue === "" && operator !== "neq") return false;

  if (isNumericField(field)) {
    const a = Number(fieldValue);
    const b = Number(conditionValue);
    switch (operator) {
      case "eq": return a === b;
      case "neq": return a !== b;
      case "gte": return a >= b;
      case "lte": return a <= b;
    }
  }

  if (isDateField(field)) {
    switch (operator) {
      case "eq": return fieldValue === conditionValue;
      case "neq": return fieldValue !== conditionValue;
      case "gte": return fieldValue >= conditionValue;
      case "lte": return fieldValue <= conditionValue;
    }
  }

  // RedmineNamedId (id 비교)
  switch (operator) {
    case "eq": return fieldValue === conditionValue;
    case "neq": return fieldValue !== conditionValue;
    case "gte": return fieldValue >= conditionValue;
    case "lte": return fieldValue <= conditionValue;
  }
}

/**
 * 필터 조건 배열을 모두 만족하는 일감만 반환 (AND 조건).
 */
export function applyFilter(issues: RedmineIssue[], conditions: FilterCondition[]): RedmineIssue[] {
  if (conditions.length === 0) return issues;

  return issues.filter((issue) =>
    conditions.every((cond) => {
      const value = getFieldValue(issue, cond.field);
      return matchCondition(value, cond.operator, cond.value, cond.field);
    })
  );
}
