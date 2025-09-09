import { jsx as _jsx } from "react/jsx-runtime";
import { Text, View } from 'react-native';
export function Headline(props) {
    return (_jsx(Text, { style: { fontSize: 24, fontWeight: '700' }, children: props.children }));
}
export function Card(props) {
    return (_jsx(View, { style: {
            padding: 16,
            borderRadius: 12,
            borderWidth: 1,
            borderColor: '#e5e7eb',
            backgroundColor: 'white',
        }, children: props.children }));
}
