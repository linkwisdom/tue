<template>
<div>
    <div>{{name}}</div>
    <ul>
        <li v-for="item in items">{{item.name}}</li>
    </ul>
</div>
</template>

<script type="text/javascript">
import conf from './fold/conf'

export default {
    data () {
        return {
            name: 'jack',
            items: conf.items
        }
    }
}
</script>