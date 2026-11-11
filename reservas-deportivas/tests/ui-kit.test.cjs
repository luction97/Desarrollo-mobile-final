const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const { createUiEnvironment: entorno } = require('./helpers/ui-environment.cjs');
const React = require('react');
const { create, act } = require('react-test-renderer');

globalThis.IS_REACT_ACT_ENVIRONMENT = true;

function flatten(style) {
  return Array.isArray(style) ? Object.assign({}, ...style.filter(Boolean).map(flatten)) : style;
}

async function conVista(elemento, comprobar) {
  let vista;
  try {
    await act(async () => { vista = create(elemento); });
    await comprobar(vista);
  } finally {
    if (vista) await act(async () => { vista.unmount(); });
  }
}

function contraste(a, b) {
  const luminancia = hex => {
    const rgb = [1, 3, 5].map(i => parseInt(hex.slice(i, i + 2), 16) / 255)
      .map(c => c <= 0.04045 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4);
    return rgb[0] * 0.2126 + rgb[1] * 0.7152 + rgb[2] * 0.0722;
  };
  const [x, y] = [luminancia(a), luminancia(b)];
  return (Math.max(x, y) + 0.05) / (Math.min(x, y) + 0.05);
}

test('Club: light y dark comparten roles y sus pares de texto cumplen AA', () => {
  const { theme } = entorno();
  assert.deepEqual(Object.keys(theme.lightColors).sort(), Object.keys(theme.darkColors).sort());
  for (const colors of [theme.lightColors, theme.darkColors]) {
    const pares = [
      ['text', 'background'], ['text', 'surface'], ['muted', 'background'], ['muted', 'surface'],
      ['onPrimary', 'primary'], ['primary', 'primaryContainer'], ['primary', 'surface'],
      ['onDanger', 'danger'], ['danger', 'dangerContainer'], ['onAccent', 'accent'],
      ['success', 'successContainer'], ['warning', 'warningContainer'], ['onDisabled', 'disabled'],
    ];
    for (const [texto, fondo] of pares) {
      assert.ok(contraste(colors[texto], colors[fondo]) >= 4.5, `${texto}/${fondo}`);
    }
    assert.ok(contraste(colors.inputBorder, colors.surface) >= 3);
  }
});

test('tokens: spacing en grilla de cuatro y tamaños táctiles de al menos 48 dp', () => {
  const { theme } = entorno();
  for (const value of Object.values(theme.spacing)) assert.equal(value % 4, 0);
  for (const size of Object.values(theme.controlSizes)) assert.ok(size.minHeight >= 48);
  assert.equal(theme.radius.card, 14);
  assert.equal(theme.typography.body.fontSize, 16);
});

test('Text usa esquema del sistema, fallback claro y conserva escalado y override', async () => {
  for (const scheme of ['light', 'dark', null]) {
    const { theme, ui } = entorno(scheme);
    await conVista(React.createElement(ui.Text, { numeric: true, style: { marginTop: 4 } }, '23:00'), vista => {
      const props = vista.root.findByType('NativeText').props;
      const style = flatten(props.style);
      assert.equal(style.color, theme.themes[scheme ?? 'light'].colors.text);
      assert.deepEqual(style.fontVariant, ['tabular-nums']);
      assert.equal(style.marginTop, 4);
      assert.notEqual(props.allowFontScaling, false);
      assert.equal(props.numberOfLines, undefined);
    });
  }
});

test('Button mantiene nombre accesible durante loading y no habilita interacción', async () => {
  const { ui } = entorno();
  await conVista(React.createElement(ui.Button, { title: 'Guardar', loading: true }), vista => {
    const props = vista.root.findByType('Pressable').props;
    assert.equal(props.accessibilityLabel, 'Guardar');
    assert.equal(props.accessibilityRole, 'button');
    assert.deepEqual(props.accessibilityState, { disabled: true, busy: true });
    assert.equal(props.disabled, true);
    assert.equal(vista.root.findAllByType('ActivityIndicator').length, 1);
  });
});

test('Button: variantes, tamaños, pressed, disabled, foco y callbacks de consumidor', async () => {
  const { ui, theme } = entorno('dark');
  for (const variant of ['primary', 'secondary', 'ghost', 'destructive']) {
    for (const size of ['sm', 'md', 'lg']) {
      let focus = 0;
      let blur = 0;
      await conVista(React.createElement(ui.Button, {
        title: 'Acción', variant, size, onFocus: () => focus++, onBlur: () => blur++,
        style: () => ({ marginTop: 8 }),
      }), async vista => {
        const pressable = () => vista.root.findByType('Pressable').props;
        assert.ok(flatten(pressable().style({ pressed: false })).minHeight >= 48);
        assert.equal(flatten(pressable().style({ pressed: true })).opacity, theme.interaction.pressedOpacity);
        assert.equal(flatten(pressable().style({ pressed: false })).marginTop, 8);
        await act(async () => pressable().onFocus({}));
        assert.equal(flatten(pressable().style({ pressed: false })).borderColor, theme.darkColors.text);
        await act(async () => pressable().onBlur({}));
        assert.equal(focus, 1);
        assert.equal(blur, 1);
      });
    }
  }
  await conVista(React.createElement(ui.Button, { title: 'Acción', disabled: true }), vista => {
    const props = vista.root.findByType('Pressable').props;
    assert.equal(props.disabled, true);
    assert.equal(flatten(props.style({ pressed: true })).backgroundColor, theme.darkColors.disabled);
    assert.equal(flatten(props.style({ pressed: true })).opacity, 1);
  });
});

test('TextField conserva valor/callbacks, muestra label y distingue foco, error y no editable', async () => {
  const { ui, theme } = entorno();
  let value;
  let focus = 0;
  await conVista(React.createElement(ui.TextField, {
    label: 'Email', value: 'a@b.ar', onChangeText: next => { value = next; },
    onFocus: () => focus++, style: { marginTop: 4 },
  }), async vista => {
    const input = () => vista.root.findByType('TextInput').props;
    assert.equal(input().accessibilityLabel, 'Email');
    assert.equal(input().value, 'a@b.ar');
    input().onChangeText('c@d.ar');
    assert.equal(value, 'c@d.ar');
    await act(async () => input().onFocus({}));
    assert.equal(flatten(input().style).borderColor, theme.lightColors.primary);
    assert.equal(focus, 1);
    await act(async () => input().onBlur({}));
    assert.equal(flatten(input().style).borderColor, theme.lightColors.inputBorder);
    assert.equal(flatten(input().style).marginTop, 4);
  });
  await conVista(React.createElement(ui.TextField, { label: 'Precio', variant: 'error', editable: false }), vista => {
    const input = vista.root.findByType('TextInput').props;
    assert.equal(input['aria-invalid'], true);
    assert.equal(input.accessibilityState.disabled, true);
    assert.equal(flatten(input.style).borderColor, theme.lightColors.danger);
    assert.equal(flatten(input.style).backgroundColor, theme.lightColors.disabled);
  });
});

test('Surface compone children, solo raised tiene sombra y permite layout override', async () => {
  const { ui, theme } = entorno();
  for (const variant of ['plain', 'outlined', 'raised']) {
    await conVista(React.createElement(ui.Surface, { variant, padding: 'xl', style: { flex: 1 } }, 'Contenido'), vista => {
      const props = vista.root.findByType('View').props;
      const style = flatten(props.style);
      assert.equal(props.children, 'Contenido');
      assert.equal(style.padding, 20);
      assert.equal(style.flex, 1);
      assert.equal(style.boxShadow, variant === 'raised' ? theme.shadows.light.card : undefined);
    });
  }
});

test('Badge conserva la etiqueta visible sin inventar estados de negocio', async () => {
  const { ui } = entorno();
  for (const variant of ['neutral', 'success', 'warning', 'danger']) {
    await conVista(React.createElement(ui.Badge, { variant }, 'Confirmada'), vista => {
      assert.equal(vista.root.findByType('NativeText').props.children, 'Confirmada');
      assert.equal(vista.root.findAllByType('Pressable').length, 0);
    });
  }
});

test('el kit no redefine colores, tamaños de fuente ni depende de capas de negocio', () => {
  const directorio = path.join(__dirname, '../src/components/ui');
  for (const archivo of fs.readdirSync(directorio).filter(f => f.endsWith('.tsx'))) {
    const codigo = fs.readFileSync(path.join(directorio, archivo), 'utf8');
    assert.doesNotMatch(codigo, /#[0-9a-f]{3,8}\b/i, archivo);
    assert.doesNotMatch(codigo, /fontSize\s*:\s*\d+/, archivo);
    assert.doesNotMatch(codigo, /(?:services|context|mocks|tipos|mapa)\//, archivo);
  }
});

test('Chip comunica selección y disabled, conserva etiqueta y feedback pressed', async () => {
  const { ui, theme } = entorno('dark');
  await conVista(React.createElement(ui.Chip, { selected: true }, 'Todos'), vista => {
    const props = vista.root.findByType('Pressable').props;
    assert.equal(props.accessibilityRole, 'button');
    assert.equal(props.accessibilityState.selected, true);
    assert.ok(flatten(props.style({ pressed: false })).minHeight >= 48);
    assert.equal(flatten(props.style({ pressed: true })).opacity, theme.interaction.pressedOpacity);
    assert.equal(vista.root.findByType('NativeText').props.children, 'Todos');
  });
  await conVista(React.createElement(ui.Chip, { selected: false, disabled: true }, 'Todos'), vista => {
    assert.equal(vista.root.findByType('Pressable').props.disabled, true);
    assert.equal(vista.root.findByType('Pressable').props.accessibilityState.disabled, true);
  });
});

test('PressableSurface mantiene tamaño táctil, estados accesibles y estilo del consumidor', async () => {
  const { ui } = entorno();
  await conVista(React.createElement(ui.PressableSurface, {
    selected: true, disabled: true, style: { marginTop: 8 }, accessibilityLabel: 'Hoy 11',
  }), vista => {
    const props = vista.root.findByType('Pressable').props;
    assert.equal(props.accessibilityLabel, 'Hoy 11');
    assert.deepEqual(props.accessibilityState, { disabled: true, selected: true });
    assert.equal(props.disabled, true);
    assert.ok(flatten(props.style({ pressed: false })).minHeight >= 48);
    assert.equal(flatten(props.style({ pressed: false })).marginTop, 8);
  });
});

test('Screen maneja insets según el header y ScrollScreen conserva scroll/teclado', async () => {
  const { ui } = entorno();
  for (const topInset of [false, true]) {
    await conVista(React.createElement(ui.Screen, { topInset }, 'Contenido'), vista => {
      const props = vista.root.findByType('SafeAreaView').props;
      assert.equal(props.edges.includes('top'), topInset);
      assert.equal(props.edges.includes('bottom'), true);
    });
  }
  await conVista(React.createElement(ui.ScrollScreen, null, 'Formulario'), vista => {
    const props = vista.root.findByType('UiScrollView').props;
    assert.equal(props.keyboardShouldPersistTaps, 'handled');
    assert.equal(props.contentInsetAdjustmentBehavior, 'automatic');
    assert.equal(props.children, 'Formulario');
  });
});

test('pantallas migradas no reintroducen hex, fontSize ni iconos de la plantilla', () => {
  const directorio = path.join(__dirname, '../app');
  function revisar(dir) {
    for (const item of fs.readdirSync(dir, { withFileTypes: true })) {
      const file = path.join(dir, item.name);
      if (item.isDirectory()) revisar(file);
      else if (file.endsWith('.tsx')) {
        const source = fs.readFileSync(file, 'utf8');
        assert.doesNotMatch(source, /#[0-9a-f]{3,8}\b/i, file);
        assert.doesNotMatch(source, /fontSize\s*:\s*\d+/, file);
        assert.doesNotMatch(source, /@expo\/vector-icons|SpaceMono/, file);
      }
    }
  }
  revisar(directorio);
});
