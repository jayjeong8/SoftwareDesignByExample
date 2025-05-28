# 데이터 테이블

### 데이터 테이블은 어떻게 구현할 수 있을까요?
#### 행 우선
- 행의 값을 메모리에 함께 저장
- 이질적 저장
  - 각 행이 객체로 표현되며, 각 필드는 서로 다른 타입의 값을 가질 수 있음 (예: `{ name: "Alice", age: 30 }`)

```js
export const buildRows = (nRows, labels) => {
  const result = [];
  
  for (let iR = 0; iR < nRows; iR += 1) {
    const row = {};
    labels.forEach(label => {
      row[label] = iR;
    })
    result.push(row);
  }
  
  // result = [{ label1: iR, label2: iR }, ...] 
  return result;
}
```

```js
// 필터링: 행 재활용해서 상대적으로 빠름
const rowFilter = (tabel, func) => {
  return table.filter(row => func(row));
}

// 셀렉트: 새로운 배열 집합을 구성해야해서 상대적으로 느림
const rowSelect = (table, toKeep) => {
  return table.map(row => {
    const newRow = {};
    toKeep.forEach(label => {
      newRow[label] = row[label];
    })
    
    return newRow;
  })
}
```

#### 열 우선
- 열의 모든 값을 함께 저장
- 동질적 순서

```js
export const buildCols = (nRows, labels) => {
  const result = {};
  
  labels.forEach(label => {
    result[label] = [];
    for (let iR = 0; iR < nRows; iR += 1) {
      result[label].push(iR);
    }
  })
  
  // result = { label1: [iR, iR2, iR3,...], ... }
  return result;
}
```

```js
// 필터링: 각 행 값이 여러 배열에 흩어져 있어서 상대적으로 느림 
const colFilter = (table, func) => {
  const result = {};
  const labels = Object.keys(table);
  labels.forEach(label => {
    result[label] = [];
  })
  
  for (let iR = 0; iR < table.label_1.length; iR += 1) {
    if (func(table, iR)) {
      labels.forEach(label => {
        result[label].push(table[label][iR]);
      })
    }
  }
  
  return result;
}

// 셀렉트: 열 재활용해서 상대적으로 빠름
const colSelect = (table, toKeep) => {
  const result = {};
  toKeep.forEach(label => {
    result[label] = table[label];
  })
  
  return result;
}
```

### 구현 성능을 어떻게 테스트 할까요?
```js
const RANGE = 3; // 필터링 조건에 사용할 값

const main = () => {
  const nRows = parseInt(process.argv[2]); // 행 수
  const nCols = parseInt(process.argv[3]); // 열 수
  const filterPerSelect = parseFloat(process.argv[4]); // select 당 필터 비율
  
  // label_1, label_2.. 형식으로 열 라벨 생성
  const labels = [...Array(nCols).keys()].map(i => `label_${i + 1}`); 
  // 열 라벨 중 절반 선택 (select 테스트용)
  const someLabels = labels.slice(0, Math.floor(labels.length / 2));
  assert(someLabels.length > 0, 'Must have some labels for select (array too short)');

  // row-wise 테이블 생성 및 메모리 사용 측정
  const [rowTable, rowSize, rowHeap] = memory(buildRows, nRows, labels);
  // column-wise 테이블 생성 및 메모리 사용 측정
  const [colTable, colSize, colHeap] = memory(buildCols, nRows, labels);
  
  // row-wise 필터링 시간 측정 (label_1 % 3 == 0 조건)
  const rowFilterTime = time(rowFilter, rowTable, row => ((row.label_1 % RANGE) === 0));
  
  // row-wise select 시간 측정 (절반의 열만 선택)
  const rowSelectTime = time(rowSelect, rowTable, someLabels);
  
  // column-wise 필터링 시간 측정 (label_1 배열에서 해당 조건 검사)
  const colFilterTime = time(colFilter, colTable, (table, iR) => ((table.label_1[iR] % RANGE) === 0))
  
  // column-wise select 시간 측정 (절반의 열만 선택)
  const colSelectTime = time(colSelect, colTable, someLabels);
  
  // 성능 비교 비율 계산 (필터 개수에 따른 weighted time 비교)
  const ratio = calculateRatio(filterPerSelect, rowFilterTime, rowSelectTime, colFilterTime, colSelectTime);
  
  // 결과를 YAML 포맷으로 출력
  const result = {
    nRows,
    nCols, 
    filterPerSelect,
    rowSize,
    rowHeap,
    colSize,
    colHeap,
    rowFilterTime,
    rowSelectTime,
    colFilterTime,
    colSelectTime,
    ratio
  }
  
  console.log(yaml.safeDump(result));
}
```

```js
// 주어진 함수 실행 전후 heap 메모리 사용량과 객체 크기 측정
const memory = (func, ...params) => {
  const before = process.memoryUsage()
  const result = func(...params)
  const after = process.memoryUsage()
  
  const heap = after.heapUsed - before.heapUsed
  const size = sizeof(result)
  return [result, size, heap]
}

// 주어진 함수의 실행 시간을 마이크로초 단위로 측정
const time = (func, ...params) => {
  const before = microtime.now()
  func(...params)
  const after = microtime.now()
  
  return after - before
}

// 주어진 필터당 셀렉트 비율에 따라 row 방식과 col 방식의 성능 비율 계산
const calculateRatio = (filterPerSelect, rFilterT, rSelectT, cFilterT, cSelectT) => {
  return ((filterPerSelect * rFilterT) + rSelectT) / ((filterPerSelect * cFilterT) + cSelectT)
}
```

```
node table-performance.js 100 3 3
```

- 열 우선 저장 성능이 메모리도 더 적게 쓰고 빠르다. 다만 좀 더 복잡해서 작성하기 어렵다.(실험에 나타나지 않는 고려해야할 비용)

### 테이블을 저장하는 가장 효율적인 방법은 무엇일까요?
#### 1. 행 우선 저장
- 각 행마다 key-value 쌍을 포함한 JSON 객체를 저장.
- Object.keys(row)를 매 행마다 문자열로 포함하므로 라벨 반복 출력 비용이 큼.
- 성능: 느리고 크다.

#### 2. 열 우선 저장
- 열 별로 배열을 구성해서 저장.
- 각 열 이름(key)마다 데이터 배열이 하나씩 대응되는 구조.
- 라벨 1회 출력, 값은 배열로 묶어서 저장하므로 효율적임.
- 성능: 가장 빠르고 파일도 작음.

#### 3. 행 우선 저장을 패킹하는 방법
- 열 이름은 한 번만 출력, 각 행의 값은 배열 형태로 저장.
- 완전한 행 우선 방식은 아니지만, 라벨 반복 제거로 효율 개선.
- 성능: 열 우선보다 2배 이상 빠르고, 파일 크기도 거의 행 우선 수준.

```js
const asPackedJson = (table) => {
  const temp = {}
  temp.keys = Object.keys(table[0])
  temp.values = table.map(row => temp.keys.map(k => row[k]))
  return JSON.stringify(temp)
}
```
- 인풋
```js
const table = [
  { name: "Alice", age: 30, city: "Seoul" },
  { name: "Bob", age: 25, city: "Busan" },
  { name: "Charlie", age: 35, city: "Incheon" }
]
```
- 아웃풋
```json
{
  "keys": ["name", "age", "city"],
  "values": [
    ["Alice", 30, "Seoul"],
    ["Bob", 25, "Busan"],
    ["Charlie", 35, "Incheon"]
  ]
}

```

### 이진 저장이 성능을 향상시키나요?
- 값을 나타내는 비트만 저장하고 타입은 직접 추적하면 공간을 절약할 수 있음
  - 자바스크립트 ArrayBuffer 클래스 사용

#### 열 우선 테이블을 ArrayBuffer에 채우기
- 2차원 테이블 데이터를 바이너리 형식(Uint8Array)으로 변환
- 열 레이블에 개행 문자를 포함할 수 없다고 가정하고 개행 문자를 구분 기호로 사용
```js
const asBinary = (table) => {
  const labels = Object.keys(table);
  const nCols = labels.length;
  const nRows = table[labels[0]].length;
  const dimensions = new Uint32Array([nCols, nRows]); // 열과 행 정보 저장
  
  
  const allLabels = labels.join('\n'); // 열 이름들에 개행 문자를 포함해서 하나의 문자열로 통합
  const encoder = new TextEncoder();
  const encodedLabels = encoder.encode(allLabels);  // 열 이름들을 인코딩
  
  const dataSize = sizeof(0) * nCols * nRows; // 바이트 크기 계산
  const totalSize = dimensions.byteLength + encodedLabels.byteLength + dataSize;
  
  const buffer = new ArrayBuffer(totalSize); 
  const result = new Uint8Array(buffer);
  result.set(dimensions,0);
  result.set(encodedLabels, dimensions.byteLength);
  
  let current = dimensions.byteLength + encodedLabels.byteLength;
  labels.forEach(label => {
    const temp = new Float64Array(table[label]);
    result.set(temp, current);
    current += temp.byteLength;
  })
  
  return result;
}
```