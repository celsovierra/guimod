import './switcher.css';

export class SwitcherControl {

  constructor(onBeforeSwitch, onSwitch, onAfterSwitch) {
    this.onBeforeSwitch = onBeforeSwitch;
    this.onSwitch = onSwitch;
    this.onAfterSwitch = onAfterSwitch;
    this.onDocumentClick = this.onDocumentClick.bind(this);
    this.styles = [];
    this.currentStyle = null;
  }

  getDefaultPosition() {
    return 'top-right';
  }

  updateStyles(updatedStyles, defaultStyle) {
    this.styles = updatedStyles;

    let selectedStyle = null;
    for (const style of this.styles) {
      if (style.id === (this.currentStyle || defaultStyle)) {
        selectedStyle = style.id;
        break;
      }
    }
    if (!selectedStyle) {
      selectedStyle = this.styles[0].id;
    }

    if (this.mapStyleContainer) {
      while (this.mapStyleContainer.firstChild) {
        this.mapStyleContainer.removeChild(this.mapStyleContainer.firstChild);
      }
    }

    let selectedStyleElement;

    for (const style of this.styles) {
      if (this.mapStyleContainer) {
        const styleElement = document.createElement('button');
        styleElement.type = 'button';
        styleElement.innerText = style.title;
        styleElement.dataset.id = style.id;
        styleElement.dataset.style = JSON.stringify(style.style);
        styleElement.addEventListener('click', (event) => {
          const { target } = event;
          if (!target.classList.contains('active')) {
            this.onSelectStyle(target);
          }
        });
        if (style.id === selectedStyle) {
          selectedStyleElement = styleElement;
          styleElement.classList.add('active');
        }
        this.mapStyleContainer.appendChild(styleElement);
      }
    }

    if (this.currentStyle !== selectedStyle) {
      if (this.mapStyleContainer) {
        this.onSelectStyle({ dataset: { id: selectedStyle } });
      } else {
        // Fallback for when UI is enabled but not rendered, or programmatic switch
        // But onSelectStyle also tries to access DOM.
        // We should use setStyle logic internally.
        const style = this.styles.find((it) => it.id === selectedStyle);
        if (style && this.map) {
          this.onBeforeSwitch();
          this.map.setStyle(style.style, { diff: false });
          this.map.setTransformRequest(style.transformRequest);
          this.onSwitch(selectedStyle);
          this.currentStyle = selectedStyle;
          this.onAfterSwitch();
        }
      }
      this.currentStyle = selectedStyle;
    }
  }

  setStyle(styleId) {
    const style = this.styles.find((it) => it.id === styleId);
    if (!style) return;

    this.onBeforeSwitch();

    if (this.map) {
      this.map.setStyle(style.style, { diff: false });
      this.map.setTransformRequest(style.transformRequest);
    }

    this.onSwitch(styleId);
    this.currentStyle = styleId;

    this.onAfterSwitch();
  }

  onSelectStyle(target) {
    this.onBeforeSwitch();

    const style = this.styles.find((it) => it.id === target.dataset.id);
    if (this.map) {
      this.map.setStyle(style.style, { diff: false });
      this.map.setTransformRequest(style.transformRequest);
    }

    this.onSwitch(target.dataset.id);

    if (this.mapStyleContainer && this.styleButton) {
      this.mapStyleContainer.style.display = 'none';
      this.styleButton.style.display = 'block';

      const elements = this.mapStyleContainer.getElementsByClassName('active');
      while (elements[0]) {
        elements[0].classList.remove('active');
      }
      target.classList.add('active');
    }

    this.currentStyle = target.dataset.id;

    this.onAfterSwitch();
  }

  onAdd(map) {
    this.map = map;
    this.controlContainer = document.createElement('div');
    this.controlContainer.classList.add('maplibregl-ctrl');
    this.controlContainer.classList.add('maplibregl-ctrl-group');
    this.mapStyleContainer = document.createElement('div');
    this.styleButton = document.createElement('button');
    this.styleButton.type = 'button';
    this.mapStyleContainer.classList.add('maplibregl-style-list');
    this.styleButton.classList.add('maplibregl-ctrl-icon');
    this.styleButton.classList.add('maplibregl-style-switcher');
    this.styleButton.addEventListener('click', () => {
      this.styleButton.style.display = 'none';
      this.mapStyleContainer.style.display = 'block';
    });
    document.addEventListener('click', this.onDocumentClick);
    this.controlContainer.appendChild(this.styleButton);
    this.controlContainer.appendChild(this.mapStyleContainer);
    return this.controlContainer;
  }

  onRemove() {
    if (!this.controlContainer || !this.controlContainer.parentNode || !this.map || !this.styleButton) {
      return;
    }
    this.styleButton.removeEventListener('click', this.onDocumentClick);
    this.controlContainer.parentNode.removeChild(this.controlContainer);
    document.removeEventListener('click', this.onDocumentClick);
    this.map = undefined;
  }

  onDocumentClick(event) {
    if (this.controlContainer && !this.controlContainer.contains(event.target) && this.mapStyleContainer && this.styleButton) {
      this.mapStyleContainer.style.display = 'none';
      this.styleButton.style.display = 'block';
    }
  }
}
