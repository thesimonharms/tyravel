import { describe, expect, it } from 'vitest';
import { compile } from './compiler.js';

describe('compile', () => {
  it('folds simple path echoes into pathEcho ops at compile time', () => {
    const template = compile('Hello {{ name }}, from {{ user.city }}!');

    expect(template.ops).toEqual([
      { type: 'text', value: 'Hello ' },
      { type: 'pathEcho', path: 'name', raw: false },
      { type: 'text', value: ', from ' },
      { type: 'pathEcho', path: 'user.city', raw: false },
      { type: 'text', value: '!' },
    ]);
  });

  it('parses layout, sections, echoes, and control flow', () => {
    const source = `@layout('layouts.app')

@section('title')
  Hello {{ name }}
@endsection

@if (show)
  <p>Visible</p>
@else
  <p>Hidden</p>
@endif

@foreach (users as user)
  <span>{{ user }}</span>
@endforeach
`;

    const template = compile(source);

    expect(template.layout).toBe('layouts.app');
    expect(template.ops.some((op) => op.type === 'section' && op.name === 'title')).toBe(
      true,
    );
    expect(template.ops.some((op) => op.type === 'if')).toBe(true);
    expect(template.ops.some((op) => op.type === 'foreach')).toBe(true);
  });

  it('parses include, component, and yield directives', () => {
    const source = `@yield('content', 'fallback')
@include('partials.header', { title: 'Home' })
@component('components.alert', { message: 'Hi' })
`;

    const template = compile(source);

    expect(template.ops).toEqual([
      { type: 'yield', name: 'content', defaultValue: 'fallback' },
      { type: 'include', name: 'partials.header', dataExpression: '{ title: \'Home\' }' },
      { type: 'component', name: 'components.alert', dataExpression: '{ message: \'Hi\' }' },
    ]);
  });

  it('parses component blocks with default and named slots', () => {
    const source = `@component('components.card', { title: 'Post' })
  <h2>{{ title }}</h2>
  @slot('footer')
    <a href="#">Read more</a>
  @endslot
@endcomponent
`;

    const template = compile(source);
    const component = template.ops.find((op) => op.type === 'component');

    expect(component).toMatchObject({
      type: 'component',
      name: 'components.card',
      dataExpression: '{ title: \'Post\' }',
    });

    if (component?.type !== 'component') {
      throw new Error('Expected component op');
    }

    expect(
      component.defaultSlot?.some((op) => op.type === 'pathEcho' || op.type === 'echo'),
    ).toBe(true);
    expect(component.namedSlots?.footer?.some((op) => op.type === 'text')).toBe(true);
  });

  it('parses push, stack, forelse, and conditional directives', () => {
    const source = `@push('scripts')
  <script src="{{ asset }}"></script>
@endpush
@stack('scripts', 'fallback')

@forelse (items as item)
  <li>{{ item }}</li>
@empty
  <li>None</li>
@endforelse

@unless (hidden)
  <p>Visible</p>
@endunless

@isset (title)
  <h1>{{ title }}</h1>
@endisset

@empty (tags)
  <p>No tags</p>
@endempty
`;

    const template = compile(source);

    expect(template.ops.some((op) => op.type === 'push' && op.name === 'scripts')).toBe(
      true,
    );
    expect(template.ops.some((op) => op.type === 'stack' && op.name === 'scripts')).toBe(
      true,
    );

    const forelse = template.ops.find((op) => op.type === 'forelse');
    expect(forelse).toMatchObject({
      type: 'forelse',
      expression: 'items as item',
    });
    if (forelse?.type === 'forelse') {
      expect(forelse.body.some((op) => op.type === 'pathEcho' || op.type === 'echo')).toBe(
        true,
      );
      expect(forelse.emptyBody.some((op) => op.type === 'text')).toBe(true);
    }

    const unless = template.ops.find(
      (op) => op.type === 'if' && op.mode === 'unless',
    );
    expect(unless).toMatchObject({
      type: 'if',
      mode: 'unless',
      expression: 'hidden',
    });

    const isset = template.ops.find((op) => op.type === 'if' && op.mode === 'isset');
    expect(isset).toMatchObject({
      type: 'if',
      mode: 'isset',
      expression: 'title',
    });

    const empty = template.ops.find((op) => op.type === 'if' && op.mode === 'empty');
    expect(empty).toMatchObject({
      type: 'if',
      mode: 'empty',
      expression: 'tags',
    });
  });

  it('parses includeIf, includeWhen, auth directives, and custom directives', () => {
    const source = `@includeIf('partials.missing')
@includeWhen(showHeader, 'partials.header', { title: 'Home' })

@auth
  <p>Authenticated</p>
@endauth

@guest
  <p>Guest</p>
@endguest

@can('edit', post)
  <button>Edit</button>
@endcan

@datetime(createdAt)
`;

    const template = compile(source, { customDirectives: new Set(['datetime']) });

    expect(template.ops.some((op) => op.type === 'includeIf')).toBe(true);
    expect(template.ops.some((op) => op.type === 'includeWhen')).toBe(true);
    expect(template.ops.some((op) => op.type === 'if' && op.mode === 'auth')).toBe(
      true,
    );
    expect(template.ops.some((op) => op.type === 'if' && op.mode === 'guest')).toBe(
      true,
    );
    expect(template.ops.some((op) => op.type === 'if' && op.mode === 'can')).toBe(true);
    expect(template.ops.some((op) => op.type === 'custom' && op.name === 'datetime')).toBe(
      true,
    );
  });

  it('parses P3 form and switch directives', () => {
    const source = `<form>
@csrf
@method('PUT')
@json(config)
@checked(old('agree'))
@selected(role === 'admin')
@disabled(locked)
@readonly(viewOnly)

@error('email')
  <span>Invalid email</span>
@enderror

@switch (status)
  @case('draft')
    <p>Draft</p>
    @break
  @default
    <p>Published</p>
@endswitch
</form>
`;

    const template = compile(source);

    expect(template.ops.some((op) => op.type === 'csrf')).toBe(true);
    expect(template.ops.some((op) => op.type === 'method' && op.verb === 'PUT')).toBe(true);
    expect(template.ops.some((op) => op.type === 'json')).toBe(true);
    expect(template.ops.filter((op) => op.type === 'formAttr').length).toBe(4);
    expect(template.ops.some((op) => op.type === 'if' && op.mode === 'error')).toBe(true);

    const switchOp = template.ops.find((op) => op.type === 'switch');
    expect(switchOp?.type).toBe('switch');
    if (switchOp?.type === 'switch') {
      expect(switchOp.cases.length).toBe(1);
      expect(switchOp.defaultBody?.length).toBeGreaterThan(0);
    }
  });

  it('parses @once blocks with explicit and generated ids', () => {
    const source = `@once('scripts')
  <script></script>
@endonce

@once
  <style></style>
@endonce
`;

    const template = compile(source);
    const explicit = template.ops.find((op) => op.type === 'once' && op.id === 'scripts');
    const generated = template.ops.find((op) => op.type === 'once' && op.id !== 'scripts');

    expect(explicit?.type).toBe('once');
    expect(generated?.type).toBe('once');
  });

  it('parses nested component blocks', () => {
    const source = `@component('components.shell')
  @component('components.alert', { message: 'Nested' })
  @endcomponent
@endcomponent
`;

    const template = compile(source);
    const shell = template.ops.find((op) => op.type === 'component');

    expect(shell?.type).toBe('component');
    if (shell?.type !== 'component') {
      throw new Error('Expected shell component');
    }

    const nested = shell.defaultSlot?.find((op) => op.type === 'component');
    expect(nested).toMatchObject({
      type: 'component',
      name: 'components.alert',
      dataExpression: '{ message: \'Nested\' }',
    });
  });

  it('parses component metadata directives and default slot definitions', () => {
    const source = `@props(['title', 'count' => 0])
@aware(['color'])

<article>{{ title }}</article>
@slot('footer')
  <span>Default footer</span>
@endslot
`;

    const template = compile(source);

    expect(template.props).toEqual({ title: undefined, count: 0 });
    expect(template.aware).toEqual(['color']);
    expect(template.ops.some((op) => op.type === 'pathEcho' || op.type === 'echo')).toBe(
      true,
    );
    expect(template.defaultSlots?.footer?.some((op) => op.type === 'text')).toBe(true);
  });

  it('parses inline @class and @style directives', () => {
    const source = `<button @class(['btn' => active, 'hidden' => false]) @style({ color: 'red' })>Save</button>`;

    const template = compile(source);

    expect(template.ops.filter((op) => op.type === 'class')).toHaveLength(1);
    expect(template.ops.filter((op) => op.type === 'style')).toHaveLength(1);
    expect(template.ops.some((op) => op.type === 'text' && op.value.includes('Save'))).toBe(
      true,
    );
  });

  it('parses P5 includeFirst, env, lang, and vite directives', () => {
    const source = `@includeFirst(['admin::partials.nav', 'partials.nav'])
@env('local', 'staging')
  <p>Dev</p>
@endenv
@production
  <p>Prod</p>
@endproduction
@local
  <p>Local</p>
@endlocal
<p>@lang('messages.welcome', { name: 'Ada' })</p>
@vite('resources/js/app.ts')
@echo
@echo('resources/client/custom-echo.ts')
`;

    const template = compile(source);

    expect(template.ops.find((op) => op.type === 'includeFirst')).toMatchObject({
      names: ['admin::partials.nav', 'partials.nav'],
    });
    expect(template.ops.some((op) => op.type === 'if' && op.mode === 'env')).toBe(true);
    expect(template.ops.some((op) => op.type === 'if' && op.mode === 'production')).toBe(true);
    expect(template.ops.some((op) => op.type === 'if' && op.mode === 'local')).toBe(true);
    expect(template.ops.some((op) => op.type === 'lang')).toBe(true);
    expect(template.ops.some((op) => op.type === 'vite')).toBe(true);
    expect(template.ops.some((op) => op.type === 'echoClient' && op.entry === 'resources/client/echo.ts')).toBe(
      true,
    );
    expect(
      template.ops.some(
        (op) => op.type === 'echoClient' && op.entry === 'resources/client/custom-echo.ts',
      ),
    ).toBe(true);
  });
});