## 1. Where is Node?
> Write a program called wherenode.js that prints the full path to the version of Node it is run with.
### 정답
```js
const nodePath = process.argv[0]; // 첫번째 인자에 Node 실행 경로가 들어있음
console.log(nodePath)
```


## 2. Tracing callbacks
> In what order does the program below print messages?

```js
const red = () => {
  console.log('RED')
}

const green = (func) => {
  console.log('GREEN')
  func()
}

const blue = (left, right) => {
  console.log('BLUE')
  left(right)
}

blue(green, red)
```
### 정답
- 실행 순서 blue(green, red) => green(red) => red()
- 'BLUE', 'GREEN', 'RED'


## 3. Tracing anonymous callbacks
> In what order does the program below print messages?

```js
const blue = (left, right) => {
  console.log('BLUE')
  left(right)
}

blue(
(callback) => {
  console.log('GREEN')
  callback()
},
() => console.log('RED')
)
```

### 정답
- 실행 순서 blue(greenCallback, redCallback), greenCallback(redCallback), redCallback()
- 'BLUE', 'GREEN', 'RED'


## 4. Checking arguments
> Modify the file copying program to check that it has been given the right number of command-line arguments and to print a sensible error message (including a usage statement) if it hasn’t.

### 정답
```js
const [srcRoot, dstRoot] = process.argv.slice(2)

if (!srcRoot || !dstRoot) {
  console.error('인자가 부족합니다.\n사용법: node copy.js <원본파일경로> <대상파일경로>')
  process.exit(1) // 에러로 강제 종료
}
```


## 5. Glob patterns
> What filenames does each of the following glob patterns match?

### 정답
- results-[0123456789].csv 
  - results-0.csv, ..., results-9.csv 등
- results.(tsv|csv)
  - results.tsv, results.csv
- results.dat?
  - results.date, results.data 등
- ./results.data
  - ./results.data


## 6. Filtering arrays
> Fill in the blank in the code below so that the output matches the one shown. Note: you can compare strings in JavaScript using <, >=, and other operators, so that (for example) person.personal > 'P' is true if someone’s personal name starts with a letter that comes after ‘P’ in the alphabet.

```js
const people = [
{ personal: 'Jean', family: 'Jennings' },
{ personal: 'Marlyn', family: 'Wescoff' },
{ personal: 'Ruth', family: 'Lichterman' },
{ personal: 'Betty', family: 'Snyder' },
{ personal: 'Frances', family: 'Bilas' },
{ personal: 'Kay', family: 'McNulty' }
]

const result = people.filter(____ => ____)

console.log(result)
```
```
[
{ personal: 'Jean', family: 'Jennings' },
{ personal: 'Ruth', family: 'Lichterman' },
{ personal: 'Frances', family: 'Bilas' }
]
```

### 정답
```js
const result = people.filter(person => person.family <= 'L')
```
```js
const result = people.filter((person, i) => i % 2 !== 0)
```


## 7. String interpolation
> Fill in the code below so that it prints the message shown.

```js
const people = [
  { personal: 'Christine', family: 'Darden' },
  { personal: 'Mary', family: 'Jackson' },
  { personal: 'Katherine', family: 'Johnson' },
  { personal: 'Dorothy', family: 'Vaughan' }
]

for (const person of people) {
  console.log(`$____, $____`)
}
```
```
Darden, Christine
Jackson, Mary
Johnson, Katherine
Vaughan, Dorothy
```

### 정답
```js
for (const person of people) {
  console.log(`${person.family}, ${person.personal}`)
}
```


## 8. Destructuring assignment
> What is assigned to each named variable in each statement below?

### 정답 (주석)
```js
const first = [10, 20, 30] // first: [10, 20, 30]
const [first, second] = [10, 20, 30] // first: 10, second: 20
const [first, second, third] = [10, 20, 30] // first: 10, second: 20, third: 30
const [first, second, third, fourth] = [10, 20, 30] // first: 10, second: 20, third: 30, fourth: undefined
const {left, right} = {left: 10, right: 30} // left: 10, right: 30
const {left, middle, right} = {left: 10, middle: 20, right: 30} // left: 10, middle: 20, right: 30
```


## 9. Counting lines
> Write a program called `lc` that counts and reports the number of lines in one or more files and the total number of lines, so that `lc a.txt b.txt` displays something like:
```
a.txt 475
b.txt 31
total 506
```

### 정답
```js
import fs from 'fs'

const files = process.argv.slice(2)

if(files.length === 0) {
  console.error('하나 이상의 파일을 입력하세요.')
  process.exit(1)
}

let total = 0;

for (const file of files) {
  const data = fs.readFileSync(file, 'utf-8');
  const lines = data.split('\n').length;
  console.log(`${file} ${lines}`);
  total += lines;
}

console.log(`total ${total}`);
```


## 10. Renaming files
> Write a program called rename that takes three or more command-line arguments:
> 1. A filename extension to match.
> 2. An extension to replace it with.
> 3. The names of one or more existing files.
> 
> When it runs, rename renames any files with the first extension to create files with the second extension, but will not overwrite an existing file. 
> For example, suppose a directory contains `a.txt`, `b.txt`, and `b.bck`.   
> The command:

``` shell
rename .txt .bck a.txt b.txt
```
> will rename `a.txt` to `a.bck`, but will not rename `b.txt` because `b.bck` already exists.

```js
import fs from 'fs'
import path from 'path';

const [sourceExt, targetExt, ...files] = process.argv.slice(2)

if(!sourceExt || !targetExt || files.length === 0) {
  console.error('사용법: node rename.js <sourceExt> <targetExt> <file1> [file2 ...]');
  process.exit(1)
}

for (const file of files) {
  if(!file.endsWith(sourceExt)) {
    continue;
  }
  
  const newName = file.replace(`${sourceExt}$`, targetExt); // 텍스트에서 정확히 확장자(.txt) 부분을 변경
  
  fs.exists(newName, (exists) => {
    if (exists) {
      console.log(`${newName}은 이미 존재하므로 새로 만들지 않습니다.`)
    } else { 
      fs.rename(file, newName, err => {
        if (err) {
          console.error(err)
        } else {
          console.log(`${file} -> ${newName}으로 변경.`)
        }
      })
    }
  })
}
```